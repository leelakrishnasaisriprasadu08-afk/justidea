export default function IdeaList({ ideas, onToggle, onRemove }) {
  if (ideas.length === 0) {
    return (
      <p className="empty-state">
        No ideas yet. Add your first one above and it will be waiting here.
      </p>
    );
  }

  return (
    <ul className="idea-list">
      {ideas.map((idea) => (
        <li key={idea.id} className={idea.done ? 'idea idea--done' : 'idea'}>
          <label className="idea__label">
            <input
              type="checkbox"
              checked={idea.done}
              onChange={() => onToggle(idea.id)}
            />
            <span className="idea__title">{idea.title}</span>
          </label>
          <button
            type="button"
            className="idea__remove"
            aria-label={`Delete idea: ${idea.title}`}
            onClick={() => onRemove(idea.id)}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
