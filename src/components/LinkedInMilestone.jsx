import { useState } from 'react';
import { linkedinConnectUrl, shareIdeaToLinkedIn } from '../api.js';

// Owner-only card: the 10,000,000-rating LinkedIn milestone and the publish
// button that unlocks when it is reached.
export default function LinkedInMilestone({ idea }) {
  const { milestone, linkedin, viewer } = idea;
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const [posted, setPosted] = useState(linkedin.posted);

  if (!viewer.isOwner) return null;

  const percent = Math.min(100, (milestone.current / milestone.target) * 100);

  async function share() {
    try {
      setState('saving');
      setError('');
      await shareIdeaToLinkedIn(idea.id);
      setPosted(true);
      setState('done');
    } catch (shareError) {
      setError(shareError.message);
      setState('idle');
    }
  }

  return (
    <section className="panel panel--accent">
      <h2 className="panel__title">LinkedIn milestone</h2>
      <p className="panel__hint">
        At {milestone.target.toLocaleString('en-US')} ratings this idea can be published to your
        LinkedIn feed.
      </p>

      <div className="progress" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="small">
        {milestone.current.toLocaleString('en-US')} / {milestone.target.toLocaleString('en-US')}{' '}
        ratings
      </p>

      {!linkedin.connected && (
        <p className="small">
          <a href={linkedinConnectUrl}>Connect LinkedIn</a> to enable publishing from here.
        </p>
      )}

      {error && <p className="form-error">{error}</p>}
      {posted && <p className="form-ok">Published to LinkedIn.</p>}

      <button
        className="button"
        type="button"
        disabled={!milestone.reached || !linkedin.connected || state === 'saving' || posted}
        title={
          !milestone.reached
            ? 'Milestone not reached yet'
            : !linkedin.connected
              ? 'Connect LinkedIn first'
              : 'Publish this idea to LinkedIn'
        }
        onClick={share}
      >
        {state === 'saving' ? 'Publishing…' : posted ? 'Published' : 'Post to LinkedIn'}
      </button>
    </section>
  );
}
