import express from 'express';
import { pool, initSchema } from './db.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(express.json());

const IDEA_COLUMNS = `
  SELECT i.id, i.title, i.pitch, i.description, i.category, i.founder_name, i.created_at,
    COALESCE((SELECT ROUND(AVG(r.score)::numeric, 1) FROM ratings r WHERE r.idea_id = i.id), 0)::float AS avg_rating,
    (SELECT COUNT(*) FROM ratings r WHERE r.idea_id = i.id)::int AS rating_count,
    (SELECT COUNT(*) FROM advice a WHERE a.idea_id = i.id)::int AS advice_count,
    (SELECT COUNT(*) FROM interests n WHERE n.idea_id = i.id)::int AS interest_count,
    (SELECT COUNT(*) FROM interests n WHERE n.idea_id = i.id AND n.kind = 'support')::int AS support_count
  FROM ideas i
`;

function text(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function ideaExists(id) {
  const { rowCount } = await pool.query('SELECT 1 FROM ideas WHERE id = $1', [id]);
  return rowCount > 0;
}

app.get('/api/ideas', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`${IDEA_COLUMNS} ORDER BY i.created_at DESC, i.id DESC`);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/ideas/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid idea id' });

    const { rows } = await pool.query(`${IDEA_COLUMNS} WHERE i.id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Idea not found' });

    const [advice, interests, ratings] = await Promise.all([
      pool.query(
        `SELECT id, author_name, body, created_at FROM advice
         WHERE idea_id = $1 ORDER BY created_at DESC`,
        [id]
      ),
      pool.query(
        `SELECT id, company, message, kind, created_at FROM interests
         WHERE idea_id = $1 ORDER BY created_at DESC`,
        [id]
      ),
      pool.query(
        `SELECT id, score, voter_name, created_at FROM ratings
         WHERE idea_id = $1 ORDER BY created_at DESC`,
        [id]
      ),
    ]);

    res.json({
      ...rows[0],
      advice: advice.rows,
      interests: interests.rows,
      ratings: ratings.rows,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/ideas', async (req, res, next) => {
  try {
    const title = text(req.body.title);
    const pitch = text(req.body.pitch);
    const founderName = text(req.body.founderName);

    if (!title || !pitch || !founderName) {
      return res
        .status(400)
        .json({ error: 'Title, one-line pitch and your name are required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO ideas (title, pitch, description, category, founder_name, founder_email)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        title.slice(0, 120),
        pitch.slice(0, 200),
        text(req.body.description).slice(0, 4000),
        text(req.body.category, 'Other') || 'Other',
        founderName.slice(0, 80),
        text(req.body.founderEmail).slice(0, 160),
      ]
    );

    res.status(201).json({ id: rows[0].id });
  } catch (error) {
    next(error);
  }
});

app.post('/api/ideas/:id/ratings', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const score = Number(req.body.score);
    if (!id) return res.status(400).json({ error: 'Invalid idea id' });
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Score must be a whole number from 1 to 5' });
    }
    if (!(await ideaExists(id))) return res.status(404).json({ error: 'Idea not found' });

    await pool.query(
      `INSERT INTO ratings (idea_id, score, voter_name) VALUES ($1, $2, $3)`,
      [id, score, text(req.body.voterName).slice(0, 80) || 'Anonymous']
    );

    const { rows } = await pool.query(`${IDEA_COLUMNS} WHERE i.id = $1`, [id]);
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.post('/api/ideas/:id/advice', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const body = text(req.body.body);
    if (!id) return res.status(400).json({ error: 'Invalid idea id' });
    if (!body) return res.status(400).json({ error: 'Advice cannot be empty' });
    if (!(await ideaExists(id))) return res.status(404).json({ error: 'Idea not found' });

    const { rows } = await pool.query(
      `INSERT INTO advice (idea_id, author_name, body) VALUES ($1, $2, $3)
       RETURNING id, author_name, body, created_at`,
      [id, text(req.body.authorName).slice(0, 80) || 'Anonymous', body.slice(0, 2000)]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.post('/api/ideas/:id/interests', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const company = text(req.body.company);
    const kind = req.body.kind === 'support' ? 'support' : 'contact';
    if (!id) return res.status(400).json({ error: 'Invalid idea id' });
    if (!company) return res.status(400).json({ error: 'Company or name is required' });
    if (!(await ideaExists(id))) return res.status(404).json({ error: 'Idea not found' });

    const { rows } = await pool.query(
      `INSERT INTO interests (idea_id, company, contact_email, message, kind)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, company, message, kind, created_at`,
      [
        id,
        company.slice(0, 120),
        text(req.body.contactEmail).slice(0, 160),
        text(req.body.message).slice(0, 2000),
        kind,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

async function start() {
  await initSchema();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Just Idea API listening on ${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
