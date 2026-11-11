export default function Stars({ value = 0, onChange, label }) {
  const filled = Math.round(value);
  const interactive = typeof onChange === 'function';

  return (
    <div className={`stars${interactive ? ' stars--interactive' : ''}`}>
      {[1, 2, 3, 4, 5].map((score) =>
        interactive ? (
          <button
            key={score}
            type="button"
            className={score <= filled ? 'star star--on' : 'star'}
            aria-label={`${score} out of 5${label ? ` for ${label}` : ''}`}
            aria-pressed={score === filled}
            onClick={() => onChange(score)}
          >
            ★
          </button>
        ) : (
          <span
            key={score}
            className={score <= filled ? 'star star--on' : 'star'}
            aria-hidden="true"
          >
            ★
          </span>
        )
      )}
    </div>
  );
}
