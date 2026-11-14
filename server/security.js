import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { CSRF_COOKIE, SESSION_SECRET, digest, parseCookies, setCookie } from './auth.js';
import { asyncHandler } from './auth.js';

// Security headers applied to every API response.
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  if (req.path.startsWith('/api/auth')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
}

// Small fixed-window limiter. Good enough for one API process; a multi-instance
// deployment should move this to Redis.
const buckets = new Map();

export function rateLimit({ windowMs, max, key = 'default' }) {
  return (req, res, next) => {
    const now = Date.now();
    const id = `${key}:${req.ip}`;
    const bucket = buckets.get(id);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(id, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ error: 'Too many attempts. Please wait a moment.' });
    }
    return next();
  };
}

function sameToken(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

export function issueCsrf(req, res) {
  const token = randomBytes(24).toString('hex');
  setCookie(res, CSRF_COOKIE, token, 60 * 60 * 24, { httpOnly: false });
  return token;
}

// Double-submit cookie check for every state-changing request.
export function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const cookieToken = parseCookies(req)[CSRF_COOKIE];
  const headerToken = req.get('x-csrf-token');
  if (!cookieToken || !headerToken || !sameToken(cookieToken, headerToken)) {
    return res.status(403).json({ error: 'Your session expired. Refresh the page and try again.' });
  }
  return next();
}

// Only JSON bodies are accepted, which blocks simple cross-site form posts.
export function requireJson(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!req.is('application/json')) {
    return res.status(415).json({ error: 'Expected a JSON request body.' });
  }
  return next();
}

// Human check: a signed arithmetic question, valid for ten minutes. It stops
// scripted sign-ups and idea spam without a third-party captcha.
const CHALLENGE_TTL_MS = 10 * 60 * 1000;

function signChallenge(payload) {
  return createHmac('sha256', `${SESSION_SECRET}:challenge`).update(payload).digest('base64url');
}

export function createChallenge() {
  const a = Math.floor(Math.random() * 8) + 2;
  const b = Math.floor(Math.random() * 8) + 2;
  const expires = Date.now() + CHALLENGE_TTL_MS;
  const payload = `${a}.${b}.${expires}`;
  return {
    token: `${payload}.${signChallenge(payload)}`,
    question: `What is ${a} + ${b}?`,
    expiresIn: Math.round(CHALLENGE_TTL_MS / 1000),
  };
}

export function verifyChallenge(token, answer) {
  if (typeof token !== 'string' || typeof answer !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 4) return false;
  const [a, b, expires, signature] = parts;

  const payload = `${a}.${b}.${expires}`;
  if (!sameToken(signature, signChallenge(payload))) return false;
  if (Number(expires) < Date.now()) return false;

  const expected = Number(a) + Number(b);
  return Number(answer.trim()) === expected;
}

export const challengeHandler = asyncHandler(async (_req, res) => {
  res.json(createChallenge());
});

// Removes any control characters from free text before it is stored.
export function cleanText(value, limit, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
  return cleaned.slice(0, limit) || fallback;
}

export function clientKey(req) {
  return digest(req.ip || 'unknown').slice(0, 16);
}
