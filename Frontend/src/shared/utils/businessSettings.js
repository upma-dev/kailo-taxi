/**
 * Business Settings Utility
 * Loads the public branding (company name, favicon, theme colors) and applies it to the document.
 */

import { API_BASE_URL } from '../../modules/Taxi/shared/api/runtimeConfig';

const SETTINGS_KEY = 'business_settings';
export const DEFAULT_COMPANY_NAME = 'Kailo Taxi';

export const normalizeCompanyName = (value) => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return DEFAULT_COMPANY_NAME;
  if (raw.toLowerCase() === 'appzeto') return DEFAULT_COMPANY_NAME;
  return raw;
};

// Initialize from localStorage immediately so it's available for components on mount
let cachedSettings = (() => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
})();

const applyThemeColors = (settings) => {
  if (typeof document === 'undefined' || !settings) return;
  const root = document.documentElement;
  const entries = [
    ['--app-theme-color', settings.themeColor],
    ['--landing-theme-color', settings.landingThemeColor],
    ['--admin-sidebar-text-color', settings.sidebarTextColor],
  ];
  entries.forEach(([name, value]) => {
    if (/^#([0-9a-fA-F]{6})$/.test(String(value || ''))) root.style.setProperty(name, value);
  });
};

/**
 * Update favicon in document
 */
export const updateFavicon = (url) => {
  if (!url || typeof document === 'undefined') return;

  document.querySelectorAll("link[rel*='icon']").forEach((el) => el.remove());

  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = url;
  // Prevent third-party cookie warning (Cloudinary)
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
};

/**
 * Update page title
 */
export const updateTitle = (companyName) => {
  if (typeof document !== 'undefined') {
    document.title = normalizeCompanyName(companyName);
  }
};

// Apply cached settings immediately on module load if they exist
if (cachedSettings) {
  setTimeout(() => {
    updateFavicon(cachedSettings.favicon?.url);
    updateTitle(cachedSettings.companyName);
    applyThemeColors(cachedSettings);
  }, 0);
}

let inFlightSettingsPromise = null;

/**
 * Load business settings from backend (public endpoint - no auth required)
 */
export const loadBusinessSettings = async () => {
  try {
    if (inFlightSettingsPromise) {
      return await inFlightSettingsPromise;
    }

    inFlightSettingsPromise = (async () => {
      const response = await fetch(`${API_BASE_URL}/business-settings/public`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return cachedSettings;

      const json = await response.json();
      const settings = json?.data || json;
      if (!settings) return cachedSettings;

      const normalizedSettings = {
        ...settings,
        companyName: normalizeCompanyName(settings.companyName),
      };
      cachedSettings = normalizedSettings;
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizedSettings));
      } catch { /* storage unavailable */ }

      updateFavicon(normalizedSettings.favicon?.url);
      updateTitle(normalizedSettings.companyName);
      applyThemeColors(normalizedSettings);
      return normalizedSettings;
    })();

    return await inFlightSettingsPromise;
  } catch {
    return cachedSettings;
  } finally {
    inFlightSettingsPromise = null;
  }
};

/**
 * Get cached settings
 */
export const getCachedSettings = () => cachedSettings;

/**
 * Get company name from business settings with fallback
 */
export const getCompanyName = () => normalizeCompanyName(getCachedSettings()?.companyName);
