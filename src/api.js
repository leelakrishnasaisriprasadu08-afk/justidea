const BASE = '/api';

let csrfToken = null;

async function loadCsrf() {
  if (csrfToken) return csrfToken;
  const response = await fetch(`${BASE}/auth/csrf`, { credentials: 'same-origin' });
  if (!response.ok) throw new Error('Could not start a secure session. Reload the page.');
  const payload = await response.json();
  csrfToken = payload.token;
  return csrfToken;
}

async function request(path, { method = 'GET', body, retry = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['X-CSRF-Token'] = await loadCsrf();

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  // A stale CSRF cookie is the one failure worth retrying once.
  if (response.status === 403 && retry && method !== 'GET') {
    csrfToken = null;
    return request(path, { method, body, retry: false });
  }

  if (!response.ok) {
    const error = new Error(payload?.error || 'Something went wrong. Please try again.');
    error.status = response.status;
    throw error;
  }
  return payload;
}

// Auth
export const getMe = () => request('/auth/me');
export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: { email, password } });
export const register = (details) =>
  request('/auth/register', { method: 'POST', body: details });
export const logout = () => request('/auth/logout', { method: 'POST', body: {} });

// Human check
export const getChallenge = () => request('/challenge');

// Ideas
export const listIdeas = () => request('/ideas');
export const getIdea = (id) => request(`/ideas/${id}`);

export const createIdea = (idea, human) =>
  request('/ideas', {
    method: 'POST',
    body: { ...idea, challengeToken: human.token, challengeAnswer: human.answer },
  });

export const rateIdea = (id, rating) =>
  request(`/ideas/${id}/ratings`, { method: 'POST', body: rating });

export const likeIdea = (id) => request(`/ideas/${id}/like`, { method: 'POST', body: {} });

export const addAdvice = (id, advice) =>
  request(`/ideas/${id}/advice`, { method: 'POST', body: advice });

export const addInterest = (id, interest) =>
  request(`/ideas/${id}/interests`, { method: 'POST', body: interest });

export const setStartupHelp = (id, settings) =>
  request(`/ideas/${id}/help`, { method: 'POST', body: settings });

export const shareIdeaToLinkedIn = (id) =>
  request(`/ideas/${id}/linkedin-post`, { method: 'POST', body: {} });

export const linkedinConnectUrl = `${BASE}/auth/linkedin/start`;
