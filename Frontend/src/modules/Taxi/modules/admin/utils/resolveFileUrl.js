// Uploaded files (selfies, documents ...) are saved as paths like "/uploads/x.jpg" that are served
// by the backend, not by the admin frontend. Opening them as-is lands on the frontend origin, where
// the router treats them as an app route and redirects. Always resolve against the backend origin.
const FILE_BASE = String(globalThis.__LEGACY_BACKEND_ORIGIN__ || '').replace(/\/+$/, '');

export const resolveFileUrl = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  return `${FILE_BASE}/${raw.replace(/^\.?\/+/, '')}`;
};

export default resolveFileUrl;
