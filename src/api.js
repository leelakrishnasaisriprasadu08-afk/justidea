const BASE = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Something went wrong. Please try again.');
  }
  return payload;
}

export const listIdeas = () => request('/ideas');

export const getIdea = (id) => request(`/ideas/${id}`);

export const createIdea = (idea) =>
  request('/ideas', { method: 'POST', body: JSON.stringify(idea) });

export const rateIdea = (id, rating) =>
  request(`/ideas/${id}/ratings`, { method: 'POST', body: JSON.stringify(rating) });

export const addAdvice = (id, advice) =>
  request(`/ideas/${id}/advice`, { method: 'POST', body: JSON.stringify(advice) });

export const addInterest = (id, interest) =>
  request(`/ideas/${id}/interests`, { method: 'POST', body: JSON.stringify(interest) });
