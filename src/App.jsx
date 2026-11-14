import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth.jsx';
import FeedPage from './pages/FeedPage.jsx';
import IdeaPage from './pages/IdeaPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SharePage from './pages/SharePage.jsx';
import TermsPage from './pages/TermsPage.jsx';

function Header() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <header className="site-header">
      <Link className="brand" to="/">
        Just Idea
      </Link>
      <nav className="site-nav">
        <NavLink to="/" end>
          Ideas
        </NavLink>
        <NavLink to="/share">Share an idea</NavLink>
        <NavLink to="/terms">Terms</NavLink>
        {!loading && !user && <NavLink to="/login">Sign in</NavLink>}
        {!loading && user && (
          <>
            <span className="nav-user" title={user.email}>
              {user.displayName}
              {user.role === 'demo' ? ' (demo)' : ''}
            </span>
            <button type="button" className="link-button" onClick={handleSignOut}>
              Sign out
            </button>
          </>
        )}
      </nav>
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
              <Route path="/" element={<FeedPage />} />
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
              <Link to="/terms">Terms of service</Link> · <Link to="/login">Sign in or use the demo account</Link>
            </p>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
