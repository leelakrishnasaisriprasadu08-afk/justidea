import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'justidea.ideas';

function readStoredIdeas() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function useIdeas() {
  const [ideas, setIdeas] = useState(readStoredIdeas);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
  }, [ideas]);

  const addIdea = useCallback((title) => {
    const text = title.trim();
    if (!text) return;
    setIdeas((current) => [
      { id: crypto.randomUUID(), title: text, done: false },
      ...current,
    ]);
  }, []);

  const toggleIdea = useCallback((id) => {
    setIdeas((current) =>
      current.map((idea) => (idea.id === id ? { ...idea, done: !idea.done } : idea))
    );
  }, []);

  const removeIdea = useCallback((id) => {
    setIdeas((current) => current.filter((idea) => idea.id !== id));
  }, []);

  return { ideas, addIdea, toggleIdea, removeIdea };
}
