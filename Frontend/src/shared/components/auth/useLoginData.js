import { useEffect, useState } from 'react';
import api from '@/modules/Taxi/shared/api/axiosInstance';

// Look & copy of the login screens. Everything here is managed by the admin
// (Promotions -> Login Banners); these are only the fallbacks used until it loads.
export const DEFAULT_LOGIN_CONFIG = {
  header_from: '#0F766E',
  header_to: '#0A4A46',
  accent_color: '#C6F432',
  tagline_user: 'Rides, parcels and outstation trips, all in one app',
  tagline_partner: 'Drive, earn and grow with Kailo.',
  show_support: true,
  support_text: 'Need assistance?',
  support_label: 'Contact Support',
  support_link: '/taxi/contact',
  copyright_text: '© 2026 Xfotech Pvt Ltd. All rights reserved.',
};

const cache = new Map();

const loadLoginData = (app) => {
  if (!cache.has(app)) {
    const request = api
      .get('/common/login-banners', { params: { app } })
      .then((response) => {
        const payload = response?.data?.data || response?.data || response || {};
        return {
          banners: Array.isArray(payload.results) ? payload.results : [],
          config: { ...DEFAULT_LOGIN_CONFIG, ...Object.fromEntries(Object.entries(payload.config || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')) },
          // show_support can legitimately be false
          ...(payload.config && payload.config.show_support === false ? { supportOff: true } : {}),
        };
      })
      .catch(() => {
        cache.delete(app);
        return { banners: [], config: DEFAULT_LOGIN_CONFIG };
      });
    cache.set(app, request);
  }
  return cache.get(app);
};

/** Banners + screen config for `app` ('user' | 'partner'). One request, shared by everything on the page. */
export default function useLoginData(app = 'user') {
  const [data, setData] = useState({ banners: [], config: DEFAULT_LOGIN_CONFIG });

  useEffect(() => {
    let cancelled = false;
    loadLoginData(app).then((next) => {
      if (!cancelled) setData({ ...next, config: { ...next.config, show_support: !next.supportOff } });
    });
    return () => {
      cancelled = true;
    };
  }, [app]);

  return data;
}
