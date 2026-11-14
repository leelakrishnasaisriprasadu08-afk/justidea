import { useCallback, useEffect, useState } from 'react';
import { getChallenge } from '../api.js';

// Lightweight human check: the server signs an arithmetic question, the answer
// comes back with the submission. No third-party captcha script.
export default function HumanCheck({ onChange, id = 'human-check' }) {
  const [challenge, setChallenge] = useState(null);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setChallenge(null);
    try {
      setChallenge(await getChallenge());
    } catch (issue) {
      setError(issue.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    onChange({ token: challenge?.token || '', answer });
  }, [challenge, answer, onChange]);

  return (
    <div className="field human-check">
      <label htmlFor={id}>
        <span>Quick human check</span>
        <div className="human-check__row">
          <span className="human-check__question">{challenge ? challenge.question : 'Loading…'}</span>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            placeholder="Answer"
            aria-label="Answer to the human check"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
          />
          <button type="button" className="link-button" onClick={load}>
            New question
          </button>
        </div>
      </label>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
