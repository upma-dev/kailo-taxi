import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../api/runtimeConfig';

// One shared fetch of the admin-controlled landing content (landing page + app login screens).
let cached = null;
let inflight = null;

const load = () => {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch(`${API_BASE_URL}/pages/landing`)
      .then((res) => res.json())
      .then((body) => {
        if (body?.success && body.data && typeof body.data === 'object') cached = body.data;
        return cached;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
};

/** Returns { content, loading }. `content` is null until loaded or if the API is unreachable. */
export function useLandingContent() {
  const [content, setContent] = useState(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let active = true;
    load().then((data) => {
      if (!active) return;
      setContent(data || null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { content, loading };
}

export const submitLandingLead = async (payload) => {
  const res = await fetch(`${API_BASE_URL}/landing/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) throw new Error(body?.message || 'Could not submit. Please try again.');
  return body;
};
