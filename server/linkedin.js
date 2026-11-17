import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { pool } from './db.js';
import {
  asyncHandler,
  createSession,
  decryptSecret,
  encryptSecret,
  normalizeEmail,
  parseCookies,
  setCookie,
  clearCookie,
} from './auth.js';
import { cleanText } from './security.js';

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';
const STATE_COOKIE = 'ji_li_state';
const SCOPES = ['openid', 'profile', 'email', 'w_member_social'];

export const linkedinConfigured = Boolean(CLIENT_ID && CLIENT_SECRET);

function baseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${proto}://${host}`;
}

function redirectUri(req) {
  return `${baseUrl(req)}/api/auth/linkedin/callback`;
}

const router = Router();

router.get('/start', (req, res) => {
  if (!linkedinConfigured) {
    return res.status(503).json({
      error: 'LinkedIn is not configured on this server yet. Add the LinkedIn client id and secret.',
    });
  }
  const state = randomBytes(16).toString('hex');
  setCookie(res, STATE_COOKIE, state, 600);

  const url = new URL('https://www.linkedin.com/oauth/v2/authorization');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri(req));
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', state);
  res.redirect(url.toString());
});

router.get(
  '/callback',
  asyncHandler(async (req, res) => {
    const state = parseCookies(req)[STATE_COOKIE];
    clearCookie(res, STATE_COOKIE);
    if (!linkedinConfigured) return res.redirect('/login?linkedin=unconfigured');
    if (!state || state !== req.query.state) return res.redirect('/login?linkedin=state');
    if (req.query.error || !req.query.code) return res.redirect('/login?linkedin=denied');

    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(req.query.code),
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri(req),
      }),
    });

    if (!tokenResponse.ok) return res.redirect('/login?linkedin=token');
    const tokenBody = await tokenResponse.json();

    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
    });
    if (!profileResponse.ok) return res.redirect('/login?linkedin=profile');
    const profile = await profileResponse.json();

    const sub = cleanText(profile.sub, 120);
    const name = cleanText(profile.name, 80) || 'LinkedIn member';
    const email = normalizeEmail(profile.email) || `linkedin-${sub}@members.justidea.local`;
    const token = encryptSecret(tokenBody.access_token);

    const existing = await pool.query(
      `SELECT id FROM users WHERE linkedin_sub = $1 OR email = $2 LIMIT 1`,
      [sub, email]
    );

    let userId;
    if (existing.rowCount > 0) {
      userId = existing.rows[0].id;
      await pool.query(
        `UPDATE users SET linkedin_sub = $1, linkedin_name = $2, linkedin_token = $3 WHERE id = $4`,
        [sub, name, token, userId]
      );
    } else {
      const created = await pool.query(
        `INSERT INTO users (email, display_name, role, linkedin_sub, linkedin_name, linkedin_token)
         VALUES ($1, $2, 'user', $3, $4, $5)
         RETURNING id`,
        [email, name, sub, name, token]
      );
      userId = created.rows[0].id;
    }

    await createSession(res, userId);
    // Linked accounts land in the app feed, the same place password sign-in goes.
    res.redirect('/ideas');
  })
);

// Publishes an idea to the owner's LinkedIn feed. Called only after the
// milestone check in the ideas router.
export async function shareIdeaToLinkedin(user, idea) {
  const accessToken = decryptSecret(user.linkedin_token);
  if (!accessToken || !user.linkedin_sub) {
    throw new Error('Connect LinkedIn before sharing this idea.');
  }

  const commentary = [
    `Milestone reached on Just Idea: "${idea.title}"`,
    '',
    idea.pitch,
    '',
    `${Number(idea.rating_count).toLocaleString('en-US')} ratings · ${Number(idea.avg_rating).toFixed(1)}/5 average`,
  ].join('\n');

  const body = {
    author: `urn:li:person:${user.linkedin_sub}`,
    commentary: commentary.slice(0, 2900),
    visibility: 'PUBLIC',
    distribution: { feedDistribution: 'MAIN_FEED' },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  const response = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202405',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('LinkedIn post failed', response.status, detail.slice(0, 500));
    throw new Error('LinkedIn rejected the post. Reconnect LinkedIn and try again.');
  }

  return response.headers.get('x-restli-id') || '';
}

export default router;
