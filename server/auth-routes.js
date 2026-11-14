import { Router } from 'express';
import { pool } from './db.js';
import {
  asyncHandler,
  createSession,
  destroySession,
  hashPassword,
  normalizeEmail,
  passwordProblem,
  publicUser,
  requireUser,
  verifyPassword,
} from './auth.js';
import { cleanText, issueCsrf, rateLimit, verifyChallenge } from './security.js';

const router = Router();

const registerLimit = rateLimit({ key: 'register', windowMs: 10 * 60 * 1000, max: 8 });
const loginLimit = rateLimit({ key: 'login', windowMs: 5 * 60 * 1000, max: 12 });

router.get('/csrf', (req, res) => {
  res.json({ token: issueCsrf(req, res) });
});

router.get('/me', (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post(
  '/register',
  registerLimit,
  asyncHandler(async (req, res) => {
    const { challengeToken, challengeAnswer, password } = req.body || {};

    if (!verifyChallenge(challengeToken, String(challengeAnswer ?? ''))) {
      return res.status(400).json({ error: 'That human check did not match. Try the new question.' });
    }

    const email = normalizeEmail(req.body?.email);
    const displayName = cleanText(req.body?.displayName, 80);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (!displayName) {
      return res.status(400).json({ error: 'Tell us the name to show on your ideas.' });
    }
    const passwordIssue = passwordProblem(password);
    if (passwordIssue) return res.status(400).json({ error: passwordIssue });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'That email already has an account. Try signing in.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, role, linkedin_sub`,
      [email, await hashPassword(password), displayName]
    );

    await createSession(res, rows[0].id);
    res.status(201).json({ user: publicUser(rows[0]) });
  })
);

router.post(
  '/login',
  loginLimit,
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    const { rows } = await pool.query(
      `SELECT id, email, password_hash, display_name, role, linkedin_sub
         FROM users WHERE email = $1`,
      [email]
    );

    const user = rows[0];
    // Always run a hash comparison so a missing account and a wrong password
    // take about the same time.
    const matches = await verifyPassword(
      password,
      user?.password_hash || 'scrypt$00000000000000000000000000000000$' + '0'.repeat(128)
    );

    if (!user || !matches) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    await createSession(res, user.id);
    res.json({ user: publicUser(user) });
  })
);

router.post(
  '/logout',
  requireUser,
  asyncHandler(async (req, res) => {
    await destroySession(req, res);
    res.json({ ok: true });
  })
);

export default router;
