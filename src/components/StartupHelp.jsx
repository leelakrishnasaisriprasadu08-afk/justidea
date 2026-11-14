import { useState } from 'react';
import { Link } from 'react-router-dom';
import { setStartupHelp } from '../api.js';
import { useAuth } from '../auth.jsx';

// Founder-owned switch that decides whether helpers may see the admin details
// for an idea. Helpers unlock it by offering support first.
export default function StartupHelp({ idea, onChanged }) {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [enabled, setEnabled] = useState(idea.startupHelp.enabled);
  const [notes, setNotes] = useState(idea.startupHelp.ownerNotes || '');
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  const { isOwner, canSeeDetails } = idea.viewer;

  async function save() {
    try {
      setState('saving');
      setError('');
      await setStartupHelp(idea.id, { enabled, notes });
      setState('saved');
      setEditing(false);
      onChanged?.();
    } catch (saveError) {
      setError(saveError.message);
      setState('idle');
    }
  }

  if (isOwner) {
    return (
      <section className="panel panel--accent">
        <h2 className="panel__title">Startup help</h2>
        <p className="panel__hint">
          Let helpers who support this idea see your admin details. You decide what they get:
          contact email, availability, what kind of help you need.
        </p>

        {!editing ? (
          <>
            <p className={`status-pill ${idea.startupHelp.enabled ? 'is-on' : ''}`}>
              {idea.startupHelp.enabled ? 'Helper handoff is open' : 'Helper handoff is closed'}
            </p>
            <button className="button button--ghost" type="button" onClick={() => setEditing(true)}>
              {idea.startupHelp.enabled ? 'Edit admin details' : 'Set up startup help'}
            </button>
          </>
        ) : (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <label className="field field--checkbox">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
              />
              <span>Allow helpers to request startup help</span>
            </label>
            <label className="field">
              <span>Details for helpers</span>
              <textarea
                rows={4}
                maxLength={1000}
                placeholder="What should helpers know? Contact email, best time to reach you, what support you need."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="inline-actions">
              <button className="button" type="submit" disabled={state === 'saving'}>
                {state === 'saving' ? 'Saving…' : 'Save startup help'}
              </button>
              <button
                className="link-button"
                type="button"
                onClick={() => {
                  setEditing(false);
                  setEnabled(idea.startupHelp.enabled);
                  setNotes(idea.startupHelp.ownerNotes || '');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    );
  }

  const disabledReason = loading
    ? 'Checking your account…'
    : !user
      ? 'Sign in to use startup help'
      : !idea.startupHelp.enabled
        ? 'The founder has not opened startup help for this idea yet'
        : !canSeeDetails
          ? 'Offer support below and the founder’s admin details unlock'
          : '';

  return (
    <section className="panel">
      <h2 className="panel__title">Startup help</h2>
      <p className="panel__hint">
        Every posted idea carries a startup-help switch. It stays locked until the founder
        turns it on for helpers.
      </p>

      <button
        className="button button--ghost"
        type="button"
        disabled={Boolean(disabledReason)}
        title={disabledReason || 'Show the founder’s admin details'}
        onClick={() => setOpen((current) => !current)}
      >
        {idea.startupHelp.enabled ? 'Startup help details' : 'Startup help (locked)'}
      </button>

      {disabledReason && <p className="muted small">{disabledReason}</p>}

      {!user && (
        <p className="small">
          <Link to="/login">Sign in</Link> or use the demo account.
        </p>
      )}

      {open && canSeeDetails && idea.startupHelp.details && (
        <div className="help-details">
          <h3 className="panel__subtitle">Founder admin details</h3>
          <p>
            <strong>{idea.startupHelp.details.founderName}</strong>
            {idea.startupHelp.details.founderEmail && (
              <>
                {' '}· <a href={`mailto:${idea.startupHelp.details.founderEmail}`}>{idea.startupHelp.details.founderEmail}</a>
              </>
            )}
          </p>
          {idea.startupHelp.details.notes && <p>{idea.startupHelp.details.notes}</p>}
        </div>
      )}
    </section>
  );
}
