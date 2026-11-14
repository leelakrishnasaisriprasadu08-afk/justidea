import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { pool } from './db.js';

const scrypt = promisify(scryptCallback);

export const SESSION_COOKIE = 'ji_session';
export const CSRF_COOKIE = 'ji_csrf';
const SESSION_DAYS = 7;
const KEY_LENGTH = 64;

// Session tokens and encrypted LinkedIn tokens are derived from this secret.
// Without one the server still boots for development, but sessions do not
// survive a restart.
export const SESSION_SECRET =
  process.env.SESSION_SECRET || randomBytes(32).toString('hex');

if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET is not set; using an ephemeral one for this process');
}

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase().slice(0, 160) : '';
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    linkedin: Boolean(row.linkedin_sub),
  };
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  if (expected.length !== KEY_LENGTH) return false;
  const key = await scrypt(password, salt, KEY_LENGTH);
  return timingSafeEqual(expected, key);
}

export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (password.length > 200) return 'Password is too long.';
  return '';
}

export function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      out[key] = part.slice(index + 1).trim();
    }
  }
  return out;
}

function cookieAttributes() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `Path=/; SameSite=Lax${secure}`;
}

export function setCookie(res, name, value, maxAgeSeconds, { httpOnly = true } = {}) {
  const age = maxAgeSeconds ? `; Max-Age=${maxAgeSeconds}` : '';
  const guard = httpOnly ? '; HttpOnly' : '';
  res.append(
    'Set-Cookie',
    `${name}=${encodeURIComponent(value)}${age}${guard}; ${cookieAttributes()}`
  );
}

export function clearCookie(res, name, { httpOnly = true } = {}) {
  const guard = httpOnly ? '; HttpOnly' : '';
  res.append('Set-Cookie', `${name}=; Max-Age=0${guard}; ${cookieAttributes()}`);
}

export async function createSession(res, userId) {
  const token = randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES ($1, $2, now() + make_interval(days => $3))`,
    [digest(token), userId, SESSION_DAYS]
  );
  setCookie(res, SESSION_COOKIE, token, SESSION_DAYS * 24 * 60 * 60);
  return token;
}

export async function destroySession(req, res) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (token) await pool.query('DELETE FROM sessions WHERE id = $1', [digest(token)]);
  clearCookie(res, SESSION_COOKIE);
}

// Loads the signed-in user for this request, if the session cookie is valid.
export async function attachUser(req, _res, next) {
  try {
    req.user = null;
    const token = parseCookies(req)[SESSION_COOKIE];
    if (!token || token.length > 200) return next();

    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.display_name, u.role, u.linkedin_sub, u.linkedin_token,
              s.expires_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.id = $1`,
      [digest(token)]
    );

    const session = rows[0];
    if (!session) return next();
    if (new Date(session.expires_at).getTime() < Date.now()) {
      await pool.query('DELETE FROM sessions WHERE id = $1', [digest(token)]);
      return next();
    }
    req.user = session;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  return next();
}

// AES-GCM wrapper so third-party tokens are never stored in plain text.
function encryptionKey() {
  return createHash('sha256').update(`${SESSION_SECRET}:linkedin`).digest();
}

export function encryptSecret(plain) {
  if (!plain) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${data.toString('base64url')}`;
}

export function decryptSecret(stored) {
  if (typeof stored !== 'string') return null;
  const [version, ivPart, tagPart, dataPart] = stored.split('.');
  if (version !== 'v1' || !ivPart || !tagPart || !dataPart) return null;
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      Buffer.from(ivPart, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
