import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listIdeas } from '../api.js';
import { useAuth } from '../auth.jsx';
import usePageMeta from '../components/PageMeta.jsx';
import IdeaCard from '../components/IdeaCard.jsx';

const STEPS = [
  {
    title: 'Post your idea',
    body: 'Sign in, describe what you are building in a few lines, and put it in front of people who will actually use it.',
  },
  {
    title: 'Get rated and advised',
    body: 'Visitors score it out of five and leave a note on what works, what does not, and what they would pay for.',
  },
  {
    title: 'Let the right people reach out',
    body: 'Founders open startup help to chosen helpers, and ideas that reach 10,000,000 ratings can be shared on LinkedIn.',
  },
];

export default function LandingPage() {
  usePageMeta({ path: '/' });
  const { user } = useAuth();
  const [ideas, setIdeas] = useState([]);

  useEffect(() => {
    listIdeas()
      .then(setIdeas)
      .catch(() => setIdeas([]));
  }, []);

  const rated = ideas.filter((idea) => idea.rating_count > 0);
  const averageScore =
    rated.length > 0
      ? (rated.reduce((total, idea) => total + Number(idea.avg_rating), 0) / rated.length).toFixed(1)
      : '—';
  const ratings = ideas.reduce((total, idea) => total + (idea.rating_count || 0), 0);
  const notes = ideas.reduce((total, idea) => total + (idea.advice_count || 0), 0);

  // Top rated ideas, or the newest ones while nothing has been rated yet.
  const featured =
    rated.length > 0
      ? [...rated].sort((a, b) => Number(b.avg_rating) - Number(a.avg_rating)).slice(0, 3)
      : ideas.slice(0, 3);
  const startHref = user ? '/ideas' : '/login?mode=register';

  return (
    <div className="landing">
      <section className="landing__hero">
        <p className="eyebrow">Ideas need a second opinion</p>
        <h1>
          Share your idea.
          <br />
          Find out if it is worth building.
        </h1>
        <p className="landing__lead">
          Just Idea is where founders put their startup ideas on the table. Everyone else rates
          them, says what they would pay for, and the right helpers reach out.
        </p>
        <div className="landing__actions">
          <Link className="button button--lg" to={startHref}>
            {user ? 'Open the app' : 'Get started'}
          </Link>
          <Link className="button--ghost" to="/ideas">
            Browse ideas
          </Link>
        </div>
        <dl className="landing__stats">
          <div className="landing__stat">
            <dt>Ideas posted</dt>
            <dd>{ideas.length}</dd>
          </div>
          <div className="landing__stat">
            <dt>Ratings</dt>
            <dd>{ratings}</dd>
          </div>
          <div className="landing__stat">
            <dt>Average score</dt>
            <dd>{averageScore}</dd>
          </div>
          <div className="landing__stat">
            <dt>Advice notes</dt>
            <dd>{notes}</dd>
          </div>
        </dl>
      </section>

      <section className="landing__section" aria-labelledby="how-it-works">
        <div className="section-head">
          <h2 id="how-it-works">How it works</h2>
          <p className="small">Three steps, no pitch decks.</p>
        </div>
        <ol className="landing__steps">
          {STEPS.map((step, index) => (
            <li className="landing__step" key={step.title}>
              <span className="landing__step-number">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {featured.length > 0 && (
        <section className="landing__section" aria-labelledby="top-ideas">
          <div className="section-head">
            <h2 id="top-ideas">{rated.length > 0 ? 'Highest rated right now' : 'Fresh ideas'}</h2>
            <Link to="/ideas">See all ideas →</Link>
          </div>
          <div className="card-grid">
            {featured.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </div>
        </section>
      )}

      <section className="landing__cta">
        <h2>Got an idea in a drawer?</h2>
        <p>
          Put it out there. Honest ratings and one good note are worth more than another month of
          guessing.
        </p>
        <Link className="button button--lg" to={startHref}>
          {user ? 'Open the app' : 'Get started'}
        </Link>
      </section>
    </div>
  );
}
