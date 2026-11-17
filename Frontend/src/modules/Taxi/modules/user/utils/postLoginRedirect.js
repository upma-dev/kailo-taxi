// Remembers the page a rider was on when they had to sign in, so they come back to it (with its state) afterwards.
const KEY = 'taxiPostLoginRedirect';

export const rememberPostLoginRedirect = (path, state = null) => {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ path, state }));
  } catch {
    // Storage can be blocked; the rider simply lands on the home page after signing in.
  }
};

// Returns { path, state } once and forgets it, or null when nothing was saved.
export const takePostLoginRedirect = () => {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    const saved = raw ? JSON.parse(raw) : null;
    return saved?.path ? saved : null;
  } catch {
    return null;
  }
};

export const goAfterLogin = (navigate, fallback = '/taxi/user') => {
  const saved = takePostLoginRedirect();
  if (saved) navigate(saved.path, { replace: true, state: saved.state || undefined });
  else navigate(fallback, { replace: true });
};
