import IdeaForm from './IdeaForm.jsx';
import IdeaList from './IdeaList.jsx';
import useIdeas from './useIdeas.js';

export default function App() {
  const { ideas, addIdea, toggleIdea, removeIdea } = useIdeas();
  const openCount = ideas.filter((idea) => !idea.done).length;

  return (
    <main className="app">
      <header className="app__header">
        <p className="app__eyebrow">Starter app</p>
        <h1>Just Idea</h1>
        <p className="app__lead">
          A small place to capture ideas before they slip away. Everything you add is
          kept in this browser.
        </p>
      </header>

      <section className="panel">
        <IdeaForm onAdd={addIdea} />

        <div className="panel__meta">
          <span>
            {ideas.length} {ideas.length === 1 ? 'idea' : 'ideas'}
          </span>
          <span>{openCount} still open</span>
        </div>

        <IdeaList ideas={ideas} onToggle={toggleIdea} onRemove={removeIdea} />
      </section>

      <footer className="app__footer">Edit a file and the preview updates instantly.</footer>
    </main>
  );
}
