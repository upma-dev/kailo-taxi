import api from '../../../shared/api/axiosInstance';
import { BACKEND_ORIGIN } from '../../../shared/api/runtimeConfig';

const resolveImage = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^(https?:|data:image\/|blob:)/i.test(raw)) return raw;
  return `${BACKEND_ORIGIN}${raw.startsWith('/') ? '' : '/'}${raw}`;
};

const cache = {};

/** Offer cards the admin set for `placement` ('top' = below Our Services, 'spotlight' = lower card deck). */
export const fetchHomeOffers = (placement = 'top') => {
  if (!cache[placement]) {
    cache[placement] = api
      .get('/common/home-offers', { params: { placement } })
      .then((response) => {
        const payload = response?.data?.data || response?.data || response || {};
        return (Array.isArray(payload.results) ? payload.results : []).map((offer) => ({ ...offer, image: resolveImage(offer.image) }));
      })
      .catch(() => {
        delete cache[placement];
        return [];
      });
  }
  return cache[placement];
};

/** Opens an offer's link: an app page navigates in the app, anything else opens in a new tab. */
export const openOfferLink = (offer, navigate) => {
  const link = String(offer?.link || '').trim();
  if (!link) return;
  if (link.startsWith('/')) navigate(link);
  else window.open(link, '_blank', 'noopener,noreferrer');
};
