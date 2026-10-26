export const ACTIVE_MODULE_KEY = 'kailo_active_module'
export const NATIVE_LAST_ROUTE_KEY = 'native_last_route'
// When the user was last on NATIVE_LAST_ROUTE_KEY (updated when the app goes to the background).
export const NATIVE_LAST_ROUTE_AT_KEY = 'native_last_route_at'

export const TAXI_ADMIN_HOME = '/taxi/admin/dashboard'
export const TAXI_ADMIN_LOGIN = '/taxi/admin/login'
export const TAXI_USER_HOME = '/taxi/user'
export const TAXI_DRIVER_HOME = '/taxi/driver/home'
export const TAXI_OWNER_HOME = '/taxi/owner/dashboard'

/**
 * Routes that rely on React Router state and must never be restored
 * after an app restart — the state would be lost, showing stale data.
 */
export const TRANSIENT_ROUTE_SEGMENTS = [
  '/ride/select-vehicle',
  '/ride/select-location',
  '/ride/searching',
  '/ride/tracking',
  '/ride/complete',
  '/ride/chat',
  '/parcel/searching',
  '/parcel/tracking',
  '/parcel/details',
  '/parcel/contacts',
  '/intercity/details',
  '/intercity/confirm',
  '/rental/vehicle',
  '/rental/schedule',
  '/rental/kyc',
  '/rental/deposit',
  '/rental/confirmed',
]

export const isTransientRoute = (route) =>
  TRANSIENT_ROUTE_SEGMENTS.some((seg) => String(route || '').includes(seg))

export function getModuleFromPath(pathname = '') {
  const path = String(pathname || '').toLowerCase()
  if (path.startsWith('/taxi/driver') || path.startsWith('/driver')) return 'taxi_driver'
  if (path.startsWith('/taxi/owner') || path.startsWith('/owner')) return 'taxi_owner'
  if (path.startsWith('/taxi/admin') || path.startsWith('/admin')) return 'admin'
  if (path.startsWith('/taxi')) return 'taxi'
  return null
}

export function getModuleHomeRoute(module) {
  if (module === 'taxi_driver' || module === 'driver') return TAXI_DRIVER_HOME
  if (module === 'taxi_owner' || module === 'owner') return TAXI_OWNER_HOME
  if (module === 'admin') return TAXI_ADMIN_HOME
  return TAXI_USER_HOME
}

export function isRoleAuthenticated(role) {
  if (typeof localStorage === 'undefined') return false
  try {
    const isTokenNotExpired = (token) => {
      if (!token) return false
      try {
        const parts = token.split('.')
        if (parts.length !== 3) return false
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        if (!payload || !payload.exp) return true
        return payload.exp * 1000 > Date.now()
      } catch {
        return false
      }
    }

    if (role === 'driver') {
      const t =
        localStorage.getItem('driver_accessToken') ||
        localStorage.getItem('driverToken') ||
        (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('driverToken') : null) ||
        (localStorage.getItem('role') === 'driver' ? localStorage.getItem('token') : null)
      return Boolean(t && isTokenNotExpired(t))
    }
    if (role === 'owner') {
      const t =
        localStorage.getItem('owner_accessToken') ||
        localStorage.getItem('driverToken') ||
        (localStorage.getItem('role') === 'owner' ? localStorage.getItem('token') : null)
      return Boolean(t && isTokenNotExpired(t))
    }
    if (role === 'admin') {
      const t = localStorage.getItem('admin_accessToken') || localStorage.getItem('adminToken')
      return Boolean(t && isTokenNotExpired(t))
    }
    if (role === 'user') {
      const t =
        localStorage.getItem('user_accessToken') ||
        localStorage.getItem('userToken') ||
        (localStorage.getItem('role') === 'user' ? localStorage.getItem('token') : null)
      return Boolean(t && isTokenNotExpired(t))
    }
  } catch {
    return false
  }
  return false
}

const getCleanPath = (raw) => {
  if (!raw) return ''
  const noHash = raw.startsWith('#') ? raw.slice(1) : raw
  return noHash.split('?')[0].replace(/\/$/, '').toLowerCase()
}

/** Home route of the panel a path belongs to, or '' when the path is not inside a panel. */
const panelHomeForPath = (path) => {
  if (path.startsWith('/taxi/driver') || path.startsWith('/driver')) return TAXI_DRIVER_HOME
  if (path.startsWith('/taxi/owner') || path.startsWith('/owner')) return TAXI_OWNER_HOME
  if (path.startsWith('/taxi/admin') || path.startsWith('/admin')) return TAXI_ADMIN_HOME
  if (path.startsWith('/taxi')) return TAXI_USER_HOME
  return ''
}

export function resolveCurrentAppHomeRoute(candidatePath = '') {
  if (typeof window === 'undefined') return TAXI_USER_HOME

  // 1. Check candidatePath or window.location.hash or window.location.pathname
  const hash = String(window.location?.hash || '')
  const currentHashPath = hash.startsWith('#/') ? getCleanPath(hash) : ''
  const currentPathname = getCleanPath(window.location?.pathname || '')
  const checkPath = getCleanPath(candidatePath) || currentHashPath || currentPathname

  if (checkPath && checkPath !== '/') {
    const home = panelHomeForPath(checkPath)
    if (home) return home
  }

  // 2. Check stored native last route
  try {
    const storedRoute = getCleanPath(localStorage.getItem(NATIVE_LAST_ROUTE_KEY) || '')
    if (storedRoute && storedRoute !== '/') {
      const isAuthPath =
        storedRoute.includes('/login') ||
        storedRoute.includes('/auth/') ||
        storedRoute.includes('/register') ||
        storedRoute.includes('/reg-') ||
        storedRoute.includes('/otp')
      if (storedRoute.startsWith('/taxi/driver') || storedRoute.startsWith('/driver')) {
        if (isRoleAuthenticated('driver')) return TAXI_DRIVER_HOME
        return isAuthPath ? storedRoute : '/taxi/driver/login'
      }
      if (storedRoute.startsWith('/taxi/owner') || storedRoute.startsWith('/owner')) {
        if (isRoleAuthenticated('owner')) return TAXI_OWNER_HOME
        return isAuthPath ? storedRoute : '/taxi/owner/login'
      }
      if (storedRoute.startsWith('/taxi/admin') || storedRoute.startsWith('/admin')) {
        return isRoleAuthenticated('admin') ? TAXI_ADMIN_HOME : TAXI_ADMIN_LOGIN
      }
      if (storedRoute.startsWith('/taxi')) {
        return TAXI_USER_HOME
      }
    }
  } catch { /* ignore */ }

  // 3. Check active module stored in localStorage
  try {
    const activeModule = String(localStorage.getItem(ACTIVE_MODULE_KEY) || '').trim()
    if (activeModule) {
      if (activeModule === 'taxi_driver' && !isRoleAuthenticated('driver')) return '/taxi/driver/login'
      if (activeModule === 'taxi_owner' && !isRoleAuthenticated('owner')) return '/taxi/owner/login'
      return getModuleHomeRoute(activeModule)
    }
  } catch { /* ignore */ }

  // 4. Check authenticated role from tokens
  if (isRoleAuthenticated('driver')) return TAXI_DRIVER_HOME
  if (isRoleAuthenticated('owner')) return TAXI_OWNER_HOME
  if (isRoleAuthenticated('admin')) return TAXI_ADMIN_HOME
  if (isRoleAuthenticated('user')) return TAXI_USER_HOME

  return '/'
}

export function syncActiveModule(pathname = '') {
  if (typeof localStorage === 'undefined') return null

  const module = getModuleFromPath(pathname)
  if (module) {
    localStorage.setItem(ACTIVE_MODULE_KEY, module)
  }
  return module
}
