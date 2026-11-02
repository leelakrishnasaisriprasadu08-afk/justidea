import { useState } from 'react';

export default function IdeaForm({ onAdd }) {
  const [title, setTitle] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    onAdd(title);
    setTitle('');
  }

  return (
    <form className="idea-form" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="idea-input">
        New idea
      </label>
      <input
        id="idea-input"
        type="text"
        placeholder="Type an idea worth keeping…"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        autoComplete="off"
      />
      <button type="submit" disabled={!title.trim()}>
        Add idea
      </button>
    </form>
  );
}
