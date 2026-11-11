import { Link } from 'react-router-dom';
import Stars from './Stars.jsx';

export default function IdeaCard({ idea }) {
  return (
    <article className="card">
      <div className="card__top">
        <span className="tag">{idea.category}</span>
        <span className="card__rating">
          <Stars value={idea.avg_rating} />
          <span>
            {Number(idea.avg_rating).toFixed(1)}
            {idea.rating_count > 0 ? ` · ${idea.rating_count}` : ' · no ratings'}
          </span>
        </span>
      </div>

      <h2 className="card__title">
        <Link to={`/ideas/${idea.id}`}>{idea.title}</Link>
      </h2>
      <p className="card__pitch">{idea.pitch}</p>

      <div className="card__meta">
        <span>by {idea.founder_name}</span>
        <span>
          {idea.advice_count} {idea.advice_count === 1 ? 'note' : 'notes'}
        </span>
        <span>
          {idea.interest_count} interested
          {idea.support_count > 0 ? ` · ${idea.support_count} supporting` : ''}
        </span>
      </div>
    </article>
  );
}
