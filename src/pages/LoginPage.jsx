import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import HumanCheck from '../components/HumanCheck.jsx';
import usePageMeta from '../components/PageMeta.jsx';

export const DEMO_ACCOUNT = { email: 'demo@justidea.dev', password: 'demo-pass-2026' };

const LINKEDIN_MESSAGES = {
  unconfigured: 'LinkedIn sign-in is not configured on this server yet.',
  state: 'That LinkedIn sign-in expired. Please try again.',
  denied: 'LinkedIn sign-in was cancelled.',
  token: 'LinkedIn did not accept the sign-in. Please try again.',
  profile: 'LinkedIn did not return a profile. Please try again.',
};

export default function LoginPage() {
  usePageMeta({
    title: 'Sign in',
    description: 'Sign in to Just Idea to rate ideas, leave advice and ask founders for startup help.',
    path: '/login',
  });

  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();

  const [mode, setMode] = useState(params.get('mode') === 'register' ? 'register' : 'signin');
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [human, setHuman] = useState({ token: '', answer: '' });
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const next = params.get('next') || '/ideas';
  const linkedinIssue = params.get('linkedin');

  const goNext = useCallback(() => {
    navigate(next.startsWith('/') ? next : '/ideas', { replace: true });
  }, [navigate, next]);

  useEffect(() => {
    if (linkedinIssue && LINKEDIN_MESSAGES[linkedinIssue]) {
      setError(LINKEDIN_MESSAGES[linkedinIssue]);
    }
  }, [linkedinIssue]);

  if (!loading && user) {
    return (
      <section className="auth">
        <div className="panel">
          <h1>You are signed in</h1>
          <p className="muted">
            Signed in as {user.displayName}. <Link to="/ideas">Go to the ideas</Link>.
          </p>
        </div>
      </section>
    );
  }

  function update(field) {
    return (event) => setForm({ ...form, [field]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      setState('saving');
      if (mode === 'signin') {
        await signIn(form.email, form.password);
      } else {
        await signUp({
          displayName: form.displayName,
          email: form.email,
          password: form.password,
          challengeToken: human.token,
          challengeAnswer: human.answer,
        });
      }
      goNext();
    } catch (authError) {
      setError(authError.message);
      setState('idle');
    }
  }

  async function useDemoAccount() {
    setError('');
    setNotice('Signing in to the demo account…');
    try {
      setState('saving');
      await signIn(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
      goNext();
    } catch (authError) {
      setError(authError.message);
      setState('idle');
    }
  }

  return (
    <section className="auth">
      <div className="auth__hero">
        <p className="eyebrow">One account, honest feedback</p>
        <h1>Sign in to rate ideas, leave advice and open startup help.</h1>
        <p className="hero__lead">
          Every rating, note and business request is tied to a real account, so founders get
          signal instead of spam. Ideas stay readable without signing in.
        </p>
        <ul className="auth__points">
          <li>One rating per person keeps averages honest.</li>
          <li>Startup-help details only reach helpers the founder approves.</li>
          <li>At 10,000,000 ratings an idea can be published to LinkedIn.</li>
        </ul>
        <p className="small">
          By creating an account you agree to the <Link to="/terms">terms of service</Link>.
        </p>
      </div>

      <div className="panel auth__card">
        <div className="segmented" role="tablist" aria-label="Sign in or create an account">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={mode === 'signin' ? 'is-active' : ''}
            onClick={() => {
              setMode('signin');
              setError('');
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={mode === 'register' ? 'is-active' : ''}
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            Create account
          </button>
        </div>

        <form className="stack" onSubmit={submit}>
          {mode === 'register' && (
            <label className="field">
              <span>Display name</span>
              <input
                type="text"
                required
                maxLength={80}
                autoComplete="name"
                placeholder="Your name"
                value={form.displayName}
                onChange={update('displayName')}
              />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              required
              maxLength={160}
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={update('email')}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              required
              minLength={8}
              maxLength={200}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder={mode === 'signin' ? 'Your password' : 'At least 8 characters'}
              value={form.password}
              onChange={update('password')}
            />
          </label>

          {mode === 'register' && <HumanCheck onChange={setHuman} id="register-human-check" />}

          {error && <p className="form-error">{error}</p>}
          {notice && <p className="form-ok">{notice}</p>}

          <button className="button" type="submit" disabled={state === 'saving'}>
            {state === 'saving'
              ? 'Please wait…'
              : mode === 'signin'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <div className="auth__demo">
          <h2 className="panel__subtitle">Demo account</h2>
          <p className="small">
            The demo account is public on purpose so anyone can explore the site. It owns the
            three example ideas.
          </p>
          <p className="small mono">
            {DEMO_ACCOUNT.email} · {DEMO_ACCOUNT.password}
          </p>
          <button
            className="button button--ghost"
            type="button"
            onClick={useDemoAccount}
            disabled={state === 'saving'}
          >
            Use the demo account
          </button>
        </div>

        <p className="small">
          <Link to="/terms">Terms of service &amp; privacy</Link>
        </p>
      </div>
    </section>
  );
}
