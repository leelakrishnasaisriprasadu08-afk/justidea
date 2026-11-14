import { pool } from './db.js';
import { hashPassword, normalizeEmail, passwordProblem } from './auth.js';

// Open demo account so anyone evaluating the site can sign in and see how it
// behaves. It is a normal account: it owns the three example ideas.
export const DEMO_EMAIL = 'demo@justidea.dev';
export const DEMO_PASSWORD = 'demo-pass-2026';
export const DEMO_NAME = 'Demo Founder';

const DEMO_TITLES = [
  'Neighbourhood tool library',
  'Plain-language contract review',
  'Kitchen scraps to compost, on a bike',
];

export async function ensureDemoUser() {
  const email = normalizeEmail(DEMO_EMAIL);
  if (passwordProblem(DEMO_PASSWORD)) throw new Error('Demo password is too short');

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  let userId;

  if (existing.rowCount > 0) {
    userId = existing.rows[0].id;
  } else {
    const created = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES ($1, $2, $3, 'demo')
       RETURNING id`,
      [email, await hashPassword(DEMO_PASSWORD), DEMO_NAME]
    );
    userId = created.rows[0].id;
  }

  // The example ideas predate accounts; give them a founder so the startup-help
  // flow can be tried on them. Scoped to those three titles only.
  await pool.query(
    `UPDATE ideas SET owner_id = $1
      WHERE owner_id IS NULL AND title = ANY($2::text[])`,
    [userId, DEMO_TITLES]
  );

  return { id: userId, email: DEMO_EMAIL };
}
