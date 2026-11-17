import { useEffect, useRef, useState } from 'react';
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './auth.jsx';
import FeedPage from './pages/FeedPage.jsx';
import IdeaPage from './pages/IdeaPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SharePage from './pages/SharePage.jsx';
import TermsPage from './pages/TermsPage.jsx';

function Header() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const onLanding = pathname === '/';

  // The menu closes on navigation, on Escape and on a click outside it.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;

    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    function handlePointer(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    }

    document.addEventListener('keydown', handleKey);
    document.addEventListener('pointerdown', handlePointer);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('pointerdown', handlePointer);
    };
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    navigate('/');
  }

  return (
    <header className="site-header">
      <Link className="brand" to={user && !onLanding ? '/ideas' : '/'}>
        Just Idea
      </Link>

      <div className="header-actions">
        {!loading && !user && onLanding && (
          <Link className="button button--small" to="/login">
            Sign in
          </Link>
        )}

        <div className="header-menu" ref={menuRef}>
          {!loading && user && (
            <span className="user-chip" title={`${user.displayName} · ${user.email}`}>
              {user.displayName.trim().charAt(0)}
            </span>
          )}

          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>

          {open && (
            <div className="menu-panel" id="site-menu">
              <nav className="menu-links" aria-label="Site">
                <NavLink to="/ideas">Ideas</NavLink>
                <NavLink to="/share">Share an idea</NavLink>
              </nav>

              <div className="menu-account">
                {!loading && user ? (
                  <>
                    <p className="menu-user">
                      {user.displayName}
                      {user.role === 'demo' ? ' · demo account' : ''}
                    </p>
                    <p className="small mono">{user.email}</p>
                    {user.role === 'demo' && (
                      <Link className="button button--small" to="/login">
                        Sign in with your account
                      </Link>
                    )}
                    <button
                      type="button"
                      className="button--ghost button--small"
                      onClick={handleSignOut}
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <p className="small">
                      Sign in to rate ideas, leave advice and ask founders for startup help.
                    </p>
                    <Link className="button button--small" to="/login">
                      Sign in
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app">
          <Header />
          <main className="content">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/ideas" element={<FeedPage />} />
              <Route path="/share" element={<SharePage />} />
              <Route path="/ideas/:id" element={<IdeaPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <footer className="site-footer">
            <p>Just Idea — founders post, everyone rates, businesses reach out.</p>
            <p className="small">
              <Link to="/ideas">Ideas</Link> · <Link to="/share">Share an idea</Link> ·{' '}
              <Link to="/terms">Terms of service</Link>
            </p>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
