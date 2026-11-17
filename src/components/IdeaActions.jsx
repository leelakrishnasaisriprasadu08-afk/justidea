import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { likeIdea } from '../api.js';
import { useAuth } from '../auth.jsx';

const iconProps = {
  width: 15,
  height: 15,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

// The four things a visitor can do with an idea, right on the card.
export default function IdeaActions({ idea }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(Boolean(idea.liked_by_me));
  const [likeCount, setLikeCount] = useState(Number(idea.like_count) || 0);
  const [saving, setSaving] = useState(false);

  async function toggleLike() {
    if (!user) {
      navigate('/login');
      return;
    }
    if (saving) return;
    try {
      setSaving(true);
      const result = await likeIdea(idea.id);
      setLiked(result.liked);
      setLikeCount(result.like_count);
    } catch {
      // Keep the previous state; the next press retries.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card__actions">
      <button
        type="button"
        className={`card-action${liked ? ' is-liked' : ''}`}
        aria-pressed={liked}
        title={user ? 'Like this idea' : 'Sign in to like this idea'}
        onClick={toggleLike}
        disabled={saving}
      >
        <svg {...iconProps} fill={liked ? 'currentColor' : 'none'}>
          <path d="M12 20.2 5.6 14A4.6 4.6 0 0 1 12 7.5a4.6 4.6 0 0 1 6.4 6.5Z" />
        </svg>
        <span>Like</span>
        {likeCount > 0 && <span className="card-action__count">{likeCount}</span>}
      </button>

      <Link className="card-action" to={`/ideas/${idea.id}#comment`} title="Read and add comments">
        <svg {...iconProps}>
          <path d="M20 15.5a2.5 2.5 0 0 1-2.5 2.5H8l-4 3V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5Z" />
        </svg>
        <span>Comment</span>
        {idea.advice_count > 0 && <span className="card-action__count">{idea.advice_count}</span>}
      </Link>

      <Link className="card-action" to={`/ideas/${idea.id}#contact`} title="Contact the founder">
        <svg {...iconProps}>
          <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
          <path d="m3.8 7 8.2 5.6L20.2 7" />
        </svg>
        <span>Contact</span>
      </Link>

      <Link
        className="card-action"
        to={`/ideas/${idea.id}#suggest`}
        title="Suggest how this founder could improve"
      >
        <svg {...iconProps}>
          <path d="M12 3a6 6 0 0 0-3.6 10.8V16h7.2v-2.2A6 6 0 0 0 12 3Z" />
          <path d="M9.4 19h5.2" />
          <path d="M10.4 21.5h3.2" />
        </svg>
        <span>Suggest</span>
      </Link>
    </div>
  );
}
