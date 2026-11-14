import { Link, useLocation } from 'react-router-dom';

export default function SignInNotice({ action }) {
  const location = useLocation();
  const next = encodeURIComponent(location.pathname);

  return (
    <section className="panel panel--muted">
      <h2 className="panel__title">Sign in to {action}</h2>
      <p className="panel__hint">
        Ratings, advice and business requests are tied to an account so one person cannot
        flood an idea. You can also try the open demo account.
      </p>
      <div className="inline-actions">
        <Link className="button" to={`/login?next=${next}`}>
          Sign in
        </Link>
        <Link className="link-button" to="/login?mode=register">
          Create account
        </Link>
      </div>
    </section>
  );
}
