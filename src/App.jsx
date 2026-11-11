import { BrowserRouter, Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import FeedPage from './pages/FeedPage.jsx';
import IdeaPage from './pages/IdeaPage.jsx';
import SharePage from './pages/SharePage.jsx';

function Header() {
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
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <main className="content">
          <Routes>
            <Route path="/" element={<FeedPage />} />
            <Route path="/share" element={<SharePage />} />
            <Route path="/ideas/:id" element={<IdeaPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="site-footer">
          Just Idea — founders post, everyone rates, businesses reach out.
        </footer>
      </div>
    </BrowserRouter>
  );
}
