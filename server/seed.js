import { pool, initSchema } from './db.js';

const DEMO_IDEAS = [
  {
    title: 'Neighbourhood tool library',
    pitch: 'Borrow a drill, ladder or pressure washer from someone two streets away.',
    description:
      'Most power tools sit unused for 360 days a year. A small membership library lets neighbours share them, with a deposit and a simple booking calendar.',
    category: 'Marketplace',
    founderName: 'Aarav Menon',
  },
  {
    title: 'Plain-language contract review',
    pitch: 'Paste a freelance contract and get the three clauses that actually matter.',
    description:
      'Freelancers sign contracts they do not fully read. This tool highlights payment terms, IP ownership and termination traps in plain English.',
    category: 'SaaS',
    founderName: 'Priya Raghavan',
  },
  {
    title: 'Kitchen scraps to compost, on a bike',
    pitch: 'Weekly doorstep pickup of food scraps for apartment buildings.',
    description:
      'A cargo-bike route collects kitchen waste from buildings without composting, and returns finished compost to residents each season.',
    category: 'Climate',
    founderName: 'Daniel Osei',
  },
];

async function seed() {
  await initSchema();
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM ideas');
  if (rows[0].count > 0) {
    console.log('Ideas already exist — skipping seed');
    return;
  }

  for (const idea of DEMO_IDEAS) {
    await pool.query(
      `INSERT INTO ideas (title, pitch, description, category, founder_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [idea.title, idea.pitch, idea.description, idea.category, idea.founderName]
    );
  }

  console.log(`Seeded ${DEMO_IDEAS.length} example ideas`);
}

seed()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(() => pool.end());
