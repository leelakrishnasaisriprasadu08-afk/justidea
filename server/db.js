import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS ideas (
  id serial PRIMARY KEY,
  title text NOT NULL,
  pitch text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Other',
  founder_name text NOT NULL,
  founder_email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ratings (
  id serial PRIMARY KEY,
  idea_id integer NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score BETWEEN 1 AND 5),
  voter_name text NOT NULL DEFAULT 'Anonymous',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS advice (
  id serial PRIMARY KEY,
  idea_id integer NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Anonymous',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interests (
  id serial PRIMARY KEY,
  idea_id integer NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  company text NOT NULL,
  contact_email text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  kind text NOT NULL CHECK (kind IN ('contact', 'support')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ratings_idea_id_idx ON ratings (idea_id);
CREATE INDEX IF NOT EXISTS advice_idea_id_idx ON advice (idea_id);
CREATE INDEX IF NOT EXISTS interests_idea_id_idx ON interests (idea_id);
`;

export async function initSchema() {
  await pool.query(SCHEMA);
}
