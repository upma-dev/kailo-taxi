import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../api/runtimeConfig';

// One shared copy of the admin-controlled landing content (landing page + app login screens).
//
// It stays fresh without a page reload:
//  - the admin editor posts a "live preview" message while typing (inside an iframe, ?lp_preview=1),
//  - saving in admin pings every open tab of the site through a BroadcastChannel,
//  - and every visitor re-checks in the background (every 30s while the tab is visible, and when it regains focus).
let cached = null;
let inflight = null;
const listeners = new Set();
const CHANNEL = 'kailo-landing';

const fetchLanding = () =>
  fetch(`${API_BASE_URL}/pages/landing`, { cache: 'no-store' })
    .then((res) => res.json())
    .then((body) => (body?.success && body.data && typeof body.data === 'object' ? body.data : null))
    .catch(() => null);

const load = () => {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetchLanding()
      .then((data) => {
        if (data) cached = data;
        return cached;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
};

/** Re-fetches the content and tells every mounted landing page if it changed. */
export const refreshLanding = async () => {
  const data = await fetchLanding();
  if (data && JSON.stringify(data) !== JSON.stringify(cached)) {
    cached = data;
    listeners.forEach((fn) => fn(data));
  }
};

/** Called by the admin editor after a save so open website tabs update straight away. */
export const announceLandingUpdate = () => {
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage({ type: 'updated' });
    ch.close();
  } catch {
    /* BroadcastChannel is not available everywhere; the 30s refresh still catches the change */
  }
};

export const isLandingPreview = () => {
  try {
    return new URLSearchParams(window.location.search).has('lp_preview');
  } catch {
    return false;
  }
};

/** Returns { content, loading }. `content` is null until loaded or if the API is unreachable. */
export function useLandingContent() {
  const [content, setContent] = useState(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let active = true;
    const apply = (data) => active && setContent(data || null);
    load().then((data) => {
      if (!active) return;
      setContent(data || null);
      setLoading(false);
    });

    if (isLandingPreview()) {
      // Inside the admin editor: show whatever draft the editor sends, instantly.
      const onMessage = (e) => {
        if (e.origin !== window.location.origin) return;
        const msg = e.data;
        if (msg?.type === 'kailo-landing-preview' && msg.data && typeof msg.data === 'object') {
          setContent(msg.data);
          setLoading(false);
        } else if (msg?.type === 'kailo-landing-scroll') {
          const target = msg.selector ? document.querySelector(msg.selector) : null;
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      };
      window.addEventListener('message', onMessage);
      window.parent?.postMessage({ type: 'kailo-landing-ready' }, window.location.origin);
      return () => {
        active = false;
        window.removeEventListener('message', onMessage);
      };
    }

    listeners.add(apply);
    let channel = null;
    try {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = () => refreshLanding();
    } catch {
      channel = null;
    }
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') refreshLanding();
    }, 30000);
    const onFocus = () => refreshLanding();
    window.addEventListener('focus', onFocus);

    return () => {
      active = false;
      listeners.delete(apply);
      clearInterval(poll);
      window.removeEventListener('focus', onFocus);
      channel?.close();
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
