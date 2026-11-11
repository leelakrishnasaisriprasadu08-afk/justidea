import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addAdvice, addInterest, getIdea, rateIdea } from '../api.js';
import Stars from '../components/Stars.jsx';

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function IdeaPage() {
  const { id } = useParams();
  const [idea, setIdea] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setIdea(await getIdea(id));
      setStatus('ready');
    } catch (loadError) {
      setError(loadError.message);
      setStatus('error');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === 'loading') return <p className="muted">Loading idea…</p>;
  if (status === 'error') {
    return (
      <div className="notice notice--error">
        {error} <Link to="/">Back to all ideas</Link>
      </div>
    );
  }

  return (
    <>
      <Link className="back-link" to="/">
        ← All ideas
      </Link>

      <article className="detail">
        <div className="detail__head">
          <span className="tag">{idea.category}</span>
          <span className="muted">Posted {formatDate(idea.created_at)}</span>
        </div>
        <h1>{idea.title}</h1>
        <p className="detail__pitch">{idea.pitch}</p>
        {idea.description && <p className="detail__body">{idea.description}</p>}
        <p className="detail__founder">Shared by {idea.founder_name}</p>
      </article>

      <div className="stat-row">
        <div className="stat">
          <span className="stat__value">
            {Number(idea.avg_rating).toFixed(1)}
            <small>/5</small>
          </span>
          <span className="stat__label">
            {idea.rating_count} {idea.rating_count === 1 ? 'rating' : 'ratings'}
          </span>
        </div>
        <div className="stat">
          <span className="stat__value">{idea.advice_count}</span>
          <span className="stat__label">notes of advice</span>
        </div>
        <div className="stat">
          <span className="stat__value">{idea.interest_count}</span>
          <span className="stat__label">businesses interested</span>
        </div>
        <div className="stat">
          <span className="stat__value">{idea.support_count}</span>
          <span className="stat__label">offering support</span>
        </div>
      </div>

      <div className="columns">
        <div className="column">
          <RateForm idea={idea} onRated={load} />
          <AdviceSection idea={idea} onAdded={load} />
        </div>
        <div className="column">
          <BusinessPanel idea={idea} onAdded={load} />
        </div>
      </div>
    </>
  );
}

function RateForm({ idea, onRated }) {
  const [score, setScore] = useState(0);
  const [voterName, setVoterName] = useState('');
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (score === 0) {
      setError('Pick a star rating first.');
      return;
    }
    try {
      setState('saving');
      setError('');
      await rateIdea(idea.id, { score, voterName });
      setScore(0);
      setVoterName('');
      setState('saved');
      onRated();
    } catch (saveError) {
      setError(saveError.message);
      setState('idle');
    }
  }

  return (
    <section className="panel">
      <h2 className="panel__title">Rate this idea</h2>
      <p className="panel__hint">
        Current score {Number(idea.avg_rating).toFixed(1)} from {idea.rating_count}{' '}
        {idea.rating_count === 1 ? 'person' : 'people'}.
      </p>
      <form className="stack" onSubmit={handleSubmit}>
        <Stars value={score} onChange={setScore} label={idea.title} />
        <input
          type="text"
          aria-label="Your name for the rating"
          placeholder="Your name (optional)"
          value={voterName}
          onChange={(event) => setVoterName(event.target.value)}
        />
        {error && <p className="form-error">{error}</p>}
        {state === 'saved' && <p className="form-ok">Thanks — your rating is in.</p>}
        <button className="button" type="submit" disabled={state === 'saving'}>
          {state === 'saving' ? 'Saving…' : 'Submit rating'}
        </button>
      </form>
    </section>
  );
}

function AdviceSection({ idea, onAdded }) {
  const [authorName, setAuthorName] = useState('');
  const [body, setBody] = useState('');
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!body.trim()) {
      setError('Write a line or two of advice.');
      return;
    }
    try {
      setState('saving');
      setError('');
      await addAdvice(idea.id, { authorName, body });
      setBody('');
      setState('idle');
      onAdded();
    } catch (saveError) {
      setError(saveError.message);
      setState('idle');
    }
  }

  return (
    <section className="panel">
      <h2 className="panel__title">Advice &amp; feedback</h2>

      <form className="stack" onSubmit={handleSubmit}>
        <input
          type="text"
          aria-label="Your name for the advice"
          placeholder="Your name (optional)"
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
        />
        <textarea
          rows={3}
          aria-label="Your advice"
          placeholder="What would you tell this founder?"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        {error && <p className="form-error">{error}</p>}
        <button className="button" type="submit" disabled={state === 'saving'}>
          {state === 'saving' ? 'Posting…' : 'Post advice'}
        </button>
      </form>

      {idea.advice.length === 0 ? (
        <p className="muted">No advice yet. Yours would be the first.</p>
      ) : (
        <ul className="advice-list">
          {idea.advice.map((note) => (
            <li key={note.id} className="advice">
              <div className="advice__meta">
                <strong>{note.author_name}</strong>
                <span>{formatDate(note.created_at)}</span>
              </div>
              <p>{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BusinessPanel({ idea, onAdded }) {
  const [kind, setKind] = useState('contact');
  const [company, setCompany] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!company.trim()) {
      setError('Tell the founder who you are.');
      return;
    }
    try {
      setState('saving');
      setError('');
      await addInterest(idea.id, { kind, company, contactEmail, message });
      setCompany('');
      setContactEmail('');
      setMessage('');
      setState('saved');
      onAdded();
    } catch (saveError) {
      setError(saveError.message);
      setState('idle');
    }
  }

  return (
    <section className="panel panel--accent">
      <h2 className="panel__title">For businesses</h2>
      <p className="panel__hint">
        Reach the founder directly, or offer support and let them come to you.
      </p>

      <div className="segmented" role="group" aria-label="How you want to engage">
        <button
          type="button"
          className={kind === 'contact' ? 'is-active' : ''}
          aria-pressed={kind === 'contact'}
          onClick={() => setKind('contact')}
        >
          Contact founder
        </button>
        <button
          type="button"
          className={kind === 'support' ? 'is-active' : ''}
          aria-pressed={kind === 'support'}
          onClick={() => setKind('support')}
        >
          Offer support
        </button>
      </div>

      <form className="stack" onSubmit={handleSubmit}>
        <input
          type="text"
          aria-label="Company or your name"
          placeholder="Company or your name"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
        />
        <input
          type="email"
          aria-label="Your email"
          placeholder="Your email (optional)"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
        />
        <textarea
          rows={3}
          aria-label="Message to the founder"
          placeholder={
            kind === 'support'
              ? 'What kind of support could you offer?'
              : 'What would you like to ask the founder?'
          }
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        {error && <p className="form-error">{error}</p>}
        {state === 'saved' && (
          <p className="form-ok">
            Sent to {idea.founder_name}. They will see it on this page.
          </p>
        )}
        <button className="button" type="submit" disabled={state === 'saving'}>
          {state === 'saving'
            ? 'Sending…'
            : kind === 'support'
              ? 'Send support offer'
              : 'Send message to founder'}
        </button>
      </form>

      {idea.interests.length > 0 && (
        <>
          <h3 className="panel__subtitle">Messages to the founder</h3>
          <ul className="advice-list">
            {idea.interests.map((interest) => (
              <li key={interest.id} className="advice">
                <div className="advice__meta">
                  <strong>{interest.company}</strong>
                  <span className={`pill pill--${interest.kind}`}>
                    {interest.kind === 'support' ? 'support' : 'contact'}
                  </span>
                </div>
                {interest.message && <p>{interest.message}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
