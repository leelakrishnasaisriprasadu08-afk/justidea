import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listIdeas } from '../api.js';
import IdeaCard from '../components/IdeaCard.jsx';

export default function FeedPage() {
  const [ideas, setIdeas] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setStatus('loading');
      setIdeas(await listIdeas());
      setStatus('ready');
    } catch (loadError) {
      setError(loadError.message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rated = ideas.filter((idea) => idea.rating_count > 0);
  const averageScore =
    rated.length > 0
      ? (
          rated.reduce((total, idea) => total + Number(idea.avg_rating), 0) / rated.length
        ).toFixed(1)
      : '—';

  return (
    <>
      <header className="hero">
        <p className="eyebrow">Ideas need a second opinion</p>
        <h1>Share an idea. Get it torn apart kindly.</h1>
        <p className="hero__lead">
          Founders post what they are building. Everyone else rates it, leaves advice, and
          businesses can reach out or back the ones worth a look.
        </p>
        <div className="hero__actions">
          <Link className="button" to="/share">
            Share your idea
          </Link>
          <span className="hero__stats">
            {ideas.length} {ideas.length === 1 ? 'idea' : 'ideas'} · {averageScore} average
            score
          </span>
        </div>
      </header>

      {status === 'error' && (
        <div className="notice notice--error">
          {error} <button onClick={load}>Retry</button>
        </div>
      )}

      {status === 'loading' && <p className="muted">Loading ideas…</p>}

      {status === 'ready' && ideas.length === 0 && (
        <div className="empty-state">
          <h2>No ideas posted yet</h2>
          <p>Be the first to put one out there and collect real feedback.</p>
          <Link className="button" to="/share">
            Share your idea
          </Link>
        </div>
      )}

      <div className="card-grid">
        {ideas.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} />
        ))}
      </div>
    </>
  );
}
