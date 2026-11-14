import { Router } from 'express';
import { pool } from './db.js';
import { asyncHandler, requireUser } from './auth.js';
import { cleanText, rateLimit, verifyChallenge } from './security.js';
import { linkedinConfigured, shareIdeaToLinkedin } from './linkedin.js';

// The LinkedIn milestone the product promises: an idea that reaches this many
// ratings can be published to the founder's LinkedIn feed.
export const MILESTONE_STARS = Number(process.env.MILESTONE_STARS || 10_000_000);

const router = Router();

const createLimit = rateLimit({ key: 'ideas:create', windowMs: 10 * 60 * 1000, max: 10 });
const rateLimitVote = rateLimit({ key: 'ideas:rate', windowMs: 10 * 60 * 1000, max: 40 });
const rateLimitAdvice = rateLimit({ key: 'ideas:advice', windowMs: 10 * 60 * 1000, max: 20 });
const rateLimitInterest = rateLimit({ key: 'ideas:interest', windowMs: 10 * 60 * 1000, max: 20 });

const FEED_COLUMNS = `
  SELECT i.id, i.title, i.pitch, i.description, i.category, i.founder_name, i.created_at,
    i.help_enabled,
    COALESCE((SELECT ROUND(AVG(r.score)::numeric, 1) FROM ratings r WHERE r.idea_id = i.id), 0)::float AS avg_rating,
    (SELECT COUNT(*) FROM ratings r WHERE r.idea_id = i.id)::int AS rating_count,
    (SELECT COUNT(*) FROM advice a WHERE a.idea_id = i.id)::int AS advice_count,
    (SELECT COUNT(*) FROM interests n WHERE n.idea_id = i.id)::int AS interest_count,
    (SELECT COUNT(*) FROM interests n WHERE n.idea_id = i.id AND n.kind = 'support')::int AS support_count
  FROM ideas i
`;

const DETAIL_COLUMNS = `
  SELECT i.id, i.title, i.pitch, i.description, i.category, i.founder_name, i.founder_email,
    i.owner_id, i.help_enabled, i.help_notes, i.created_at,
    COALESCE((SELECT ROUND(AVG(r.score)::numeric, 1) FROM ratings r WHERE r.idea_id = i.id), 0)::float AS avg_rating,
    (SELECT COUNT(*) FROM ratings r WHERE r.idea_id = i.id)::int AS rating_count,
    (SELECT COUNT(*) FROM advice a WHERE a.idea_id = i.id)::int AS advice_count,
    (SELECT COUNT(*) FROM interests n WHERE n.idea_id = i.id)::int AS interest_count,
    (SELECT COUNT(*) FROM interests n WHERE n.idea_id = i.id AND n.kind = 'support')::int AS support_count
  FROM ideas i
`;

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function loadDetail(id) {
  const { rows } = await pool.query(`${DETAIL_COLUMNS} WHERE i.id = $1`, [id]);
  if (rows.length === 0) return null;

  const [advice, interests, ratings, posts] = await Promise.all([
    pool.query(
      `SELECT id, author_name, body, created_at FROM advice
       WHERE idea_id = $1 ORDER BY created_at DESC`,
      [id]
    ),
    pool.query(
      `SELECT id, company, message, kind, helper_user_id, created_at FROM interests
       WHERE idea_id = $1 ORDER BY created_at DESC`,
      [id]
    ),
    pool.query(
      `SELECT id, score, voter_name, created_at FROM ratings
       WHERE idea_id = $1 ORDER BY created_at DESC`,
      [id]
    ),
    pool.query(
      `SELECT post_urn, posted_at FROM linkedin_posts
       WHERE idea_id = $1 ORDER BY posted_at DESC LIMIT 1`,
      [id]
    ),
  ]);

  return {
    idea: rows[0],
    advice: advice.rows,
    interests: interests.rows,
    ratings: ratings.rows,
    lastPost: posts.rows[0] || null,
  };
}

function shapeDetail(detail, user) {
  const { idea, advice, interests, ratings, lastPost } = detail;
  const viewerId = user?.id ?? null;
  const isOwner = Boolean(viewerId && idea.owner_id === viewerId);
  const isHelper = Boolean(viewerId && interests.some((row) => row.helper_user_id === viewerId));
  const canSeeHelp = isOwner || isHelper || user?.role === 'admin';
  const helpVisible = Boolean(idea.help_enabled && canSeeHelp);

  return {
    id: idea.id,
    title: idea.title,
    pitch: idea.pitch,
    description: idea.description,
    category: idea.category,
    founder_name: idea.founder_name,
    created_at: idea.created_at,
    avg_rating: idea.avg_rating,
    rating_count: idea.rating_count,
    advice_count: idea.advice_count,
    interest_count: idea.interest_count,
    support_count: idea.support_count,
    advice,
    // Helper identities are never exposed to the public feed.
    interests: interests.map((row) => ({
      id: row.id,
      company: row.company,
      message: row.message,
      kind: row.kind,
      created_at: row.created_at,
    })),
    ratings,
    viewer: {
      signedIn: Boolean(viewerId),
      isOwner,
      isHelper,
      canSeeHelp,
    },
    startupHelp: {
      enabled: Boolean(idea.help_enabled),
      canSeeDetails: helpVisible,
      ownerNotes: isOwner || user?.role === 'admin' ? idea.help_notes : undefined,
      details: helpVisible
        ? {
            founderName: idea.founder_name,
            founderEmail: idea.founder_email,
            notes: idea.help_notes,
          }
        : null,
    },
    milestone: {
      target: MILESTONE_STARS,
      current: idea.rating_count,
      reached: idea.rating_count >= MILESTONE_STARS,
    },
    linkedin: {
      configured: linkedinConfigured,
      connected: Boolean(user?.linkedin_sub),
      posted: Boolean(lastPost),
      lastPostAt: lastPost?.posted_at || null,
    },
  };
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      `${FEED_COLUMNS} ORDER BY i.created_at DESC, i.id DESC`
    );
    res.json(rows);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid idea id' });

    const detail = await loadDetail(id);
    if (!detail) return res.status(404).json({ error: 'Idea not found' });

    res.json(shapeDetail(detail, req.user));
  })
);

router.post(
  '/',
  requireUser,
  createLimit,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    if (!verifyChallenge(body.challengeToken, String(body.challengeAnswer ?? ''))) {
      return res.status(400).json({ error: 'That human check did not match. Try the new question.' });
    }

    const title = cleanText(body.title, 120);
    const pitch = cleanText(body.pitch, 200);
    if (!title || !pitch) {
      return res.status(400).json({ error: 'Title and one-line pitch are required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO ideas (title, pitch, description, category, founder_name, founder_email, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        title,
        pitch,
        cleanText(body.description, 4000),
        cleanText(body.category, 40) || 'Other',
        cleanText(body.founderName, 80) || req.user.display_name,
        cleanText(body.founderEmail, 160) || req.user.email,
        req.user.id,
      ]
    );

    res.status(201).json({ id: rows[0].id });
  })
);

router.post(
  '/:id/ratings',
  requireUser,
  rateLimitVote,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const score = Number(req.body?.score);
    if (!id) return res.status(400).json({ error: 'Invalid idea id' });
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Score must be a whole number from 1 to 5' });
    }

    const exists = await pool.query('SELECT 1 FROM ideas WHERE id = $1', [id]);
    if (exists.rowCount === 0) return res.status(404).json({ error: 'Idea not found' });

    await pool.query(
      `INSERT INTO ratings (idea_id, score, voter_name) VALUES ($1, $2, $3)`,
      [id, score, cleanText(req.body?.voterName, 80) || req.user.display_name]
    );

    const { rows } = await pool.query(`${FEED_COLUMNS} WHERE i.id = $1`, [id]);
    res.status(201).json(rows[0]);
  })
);

router.post(
  '/:id/advice',
  requireUser,
  rateLimitAdvice,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const body = cleanText(req.body?.body, 2000);
    if (!id) return res.status(400).json({ error: 'Invalid idea id' });
    if (!body) return res.status(400).json({ error: 'Advice cannot be empty' });

    const exists = await pool.query('SELECT 1 FROM ideas WHERE id = $1', [id]);
    if (exists.rowCount === 0) return res.status(404).json({ error: 'Idea not found' });

    const { rows } = await pool.query(
      `INSERT INTO advice (idea_id, author_name, body) VALUES ($1, $2, $3)
       RETURNING id, author_name, body, created_at`,
      [id, cleanText(req.body?.authorName, 80) || req.user.display_name, body]
    );

    res.status(201).json(rows[0]);
  })
);

router.post(
  '/:id/interests',
  requireUser,
  rateLimitInterest,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const company = cleanText(req.body?.company, 120);
    const kind = req.body?.kind === 'support' ? 'support' : 'contact';
    if (!id) return res.status(400).json({ error: 'Invalid idea id' });
    if (!company) return res.status(400).json({ error: 'Company or name is required' });

    const exists = await pool.query('SELECT 1 FROM ideas WHERE id = $1', [id]);
    if (exists.rowCount === 0) return res.status(404).json({ error: 'Idea not found' });

    const { rows } = await pool.query(
      `INSERT INTO interests (idea_id, company, contact_email, message, kind, helper_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, company, message, kind, created_at`,
      [
        id,
        company,
        cleanText(req.body?.contactEmail, 160),
        cleanText(req.body?.message, 2000),
        kind,
        req.user.id,
      ]
    );

    res.status(201).json(rows[0]);
  })
);

// Only the person who posted the idea can open or close startup help, and only
// they decide what contact details helpers receive.
router.post(
  '/:id/help',
  requireUser,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid idea id' });

    const { rows } = await pool.query('SELECT owner_id FROM ideas WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Idea not found' });
    if (rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the founder who posted this idea can change it.' });
    }

    const enabled = Boolean(req.body?.enabled);
    const notes = cleanText(req.body?.notes, 1000);

    await pool.query('UPDATE ideas SET help_enabled = $1, help_notes = $2 WHERE id = $3', [
      enabled,
      notes,
      id,
    ]);

    res.json({ ok: true, enabled, notes });
  })
);

router.post(
  '/:id/linkedin-post',
  requireUser,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid idea id' });

    const detail = await loadDetail(id);
    if (!detail) return res.status(404).json({ error: 'Idea not found' });

    const { idea } = detail;
    if (idea.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the founder who posted this idea can share it.' });
    }
    if (idea.rating_count < MILESTONE_STARS) {
      return res.status(400).json({
        error: `This idea needs ${MILESTONE_STARS.toLocaleString('en-US')} ratings before it can be posted to LinkedIn.`,
      });
    }
    if (!req.user.linkedin_sub) {
      return res.status(400).json({ error: 'Connect your LinkedIn account first.' });
    }

    const urn = await shareIdeaToLinkedin(req.user, idea);

    await pool.query(
      `INSERT INTO linkedin_posts (idea_id, user_id, post_urn) VALUES ($1, $2, $3)`,
      [id, req.user.id, urn]
    );

    res.status(201).json({ ok: true, urn });
  })
);

export default router;
