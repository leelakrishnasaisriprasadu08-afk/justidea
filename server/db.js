import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'demo', 'admin')),
  linkedin_sub text UNIQUE,
  linkedin_name text,
  linkedin_token text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

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

ALTER TABLE ideas ADD COLUMN IF NOT EXISTS owner_id integer REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS help_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS help_notes text NOT NULL DEFAULT '';

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

ALTER TABLE interests ADD COLUMN IF NOT EXISTS helper_user_id integer REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS idea_likes (
  idea_id integer NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (idea_id, user_id)
);

CREATE TABLE IF NOT EXISTS linkedin_posts (
  id serial PRIMARY KEY,
  idea_id integer NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id integer REFERENCES users(id) ON DELETE SET NULL,
  post_urn text NOT NULL DEFAULT '',
  posted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ratings_idea_id_idx ON ratings (idea_id);
CREATE INDEX IF NOT EXISTS advice_idea_id_idx ON advice (idea_id);
CREATE INDEX IF NOT EXISTS interests_idea_id_idx ON interests (idea_id);
CREATE INDEX IF NOT EXISTS idea_likes_idea_id_idx ON idea_likes (idea_id);
CREATE INDEX IF NOT EXISTS ideas_owner_id_idx ON ideas (owner_id);
`;

export async function initSchema() {
  await pool.query(SCHEMA);
}
