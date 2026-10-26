/**
 * Auth/session helpers shared across the Taxi panels (user, driver, owner, admin).
 * Tokens are stored per module as `<module>_accessToken` in localStorage.
 */

/**
 * Decode JWT token without verification (client-side only)
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded token payload or null if invalid
 */
export function decodeToken(token) {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Check if token is expired (or unreadable)
 * @param {string} token - JWT token
 * @returns {boolean}
 */
export function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return decoded.exp * 1000 < Date.now();
}

/**
 * Get module-specific access token
 * @param {string} module - Module name (admin, driver, owner, user)
 * @returns {string|null}
 */
export function getModuleToken(module) {
  if (module === 'driver') {
    return (
      localStorage.getItem('driver_accessToken') ||
      localStorage.getItem('driverToken') ||
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('driverToken') : null) ||
      (localStorage.getItem('role') === 'driver' ? localStorage.getItem('token') : null)
    );
  }
  return localStorage.getItem(`${module}_accessToken`);
}

/**
 * Get current user's role from a specific module's storage
 * @param {string} module - Module name
 * @returns {string|null}
 */
export function getCurrentUserRole(module = null) {
  if (module) {
    const userStr = localStorage.getItem(`${module}_user`);
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.role || module;
      } catch {
        return module;
      }
    }
  }
  return module || 'user';
}

/**
 * Get current user object from specific module's storage
 * @param {string} module - Module name
 * @returns {Object|null}
 */
export function getCurrentUser(module) {
  if (!module) return null;
  const userStr = localStorage.getItem(`${module}_user`);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated for a specific module
 * @param {string} module - Module name
 * @returns {boolean}
 */
export function isModuleAuthenticated(module) {
  const token = getModuleToken(module);
  return !!token && !isTokenExpired(token);
}
