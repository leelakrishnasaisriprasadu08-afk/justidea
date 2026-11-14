import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { createIdea } from '../api.js';
import { useAuth } from '../auth.jsx';
import HumanCheck from '../components/HumanCheck.jsx';
import usePageMeta from '../components/PageMeta.jsx';

const CATEGORIES = [
  'SaaS',
  'Marketplace',
  'Consumer',
  'Climate',
  'Fintech',
  'Health',
  'Education',
  'Other',
];

export default function SharePage() {
  usePageMeta({
    title: 'Share an idea',
    description:
      'Post your startup idea on Just Idea and collect star ratings, written advice and business support requests.',
    path: '/share',
  });

  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [form, setForm] = useState({
    title: '',
    pitch: '',
    description: '',
    category: 'SaaS',
    founderName: user?.displayName || '',
    founderEmail: user?.email || '',
  });
  const [human, setHuman] = useState({ token: '', answer: '' });
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  if (loading) return <p className="muted">Checking your account…</p>;
  if (!user) return <Navigate to="/login?next=%2Fshare" replace />;

  function update(field) {
    return (event) => setForm({ ...form, [field]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setState('saving');
      setError('');
      const { id } = await createIdea(form, human);
      navigate(`/ideas/${id}`);
    } catch (saveError) {
      setError(saveError.message);
      setState('idle');
    }
  }

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Share</p>
        <h1>Post your startup idea</h1>
        <p className="hero__lead">
          Keep the pitch to one sentence. People rate it, tell you what is broken, and
          businesses can reach out. You can open startup help afterwards.
        </p>
        <p className="muted small">Posting as {user.displayName}.</p>
      </header>

      <form className="panel stack form-panel" onSubmit={handleSubmit}>
        <label className="field">
          <span>Idea name</span>
          <input
            type="text"
            required
            maxLength={120}
            placeholder="Neighbourhood tool library"
            value={form.title}
            onChange={update('title')}
          />
        </label>

        <label className="field">
          <span>One-line pitch</span>
          <input
            type="text"
            required
            maxLength={200}
            placeholder="Borrow a drill from someone two streets away."
            value={form.pitch}
            onChange={update('pitch')}
          />
        </label>

        <label className="field">
          <span>The longer version</span>
          <textarea
            rows={5}
            maxLength={4000}
            placeholder="Who has this problem, and why does your idea solve it?"
            value={form.description}
            onChange={update('description')}
          />
        </label>

        <label className="field">
          <span>Category</span>
          <select value={form.category} onChange={update('category')}>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <div className="field-row">
          <label className="field">
            <span>Your name</span>
            <input
              type="text"
              required
              maxLength={80}
              placeholder="Aarav Menon"
              value={form.founderName}
              onChange={update('founderName')}
            />
          </label>
          <label className="field">
            <span>Admin email for helpers (optional)</span>
            <input
              type="email"
              maxLength={160}
              placeholder="you@example.com"
              value={form.founderEmail}
              onChange={update('founderEmail')}
            />
          </label>
        </div>

        <HumanCheck onChange={setHuman} id="idea-human-check" />

        {error && <p className="form-error">{error}</p>}

        <button className="button" type="submit" disabled={state === 'saving'}>
          {state === 'saving' ? 'Posting…' : 'Post idea'}
        </button>
      </form>
    </>
  );
}
