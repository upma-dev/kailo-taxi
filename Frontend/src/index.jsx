import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './app/App.jsx'
import { isModuleAuthenticated } from './shared/utils/auth.js'
import { syncThemeForPath } from './shared/utils/theme.js'
import {
  NATIVE_LAST_ROUTE_AT_KEY,
  NATIVE_LAST_ROUTE_KEY,
  TAXI_ADMIN_HOME,
  TAXI_DRIVER_HOME,
  TAXI_OWNER_HOME,
  TAXI_USER_HOME,
  isTransientRoute,
  resolveCurrentAppHomeRoute,
} from './shared/utils/activeModule.js'
import './shared/styles/global.css'
import { registerSW } from 'virtual:pwa-register'

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // In development mode, unregister any service workers so they don't cache or break Vite HMR dynamic modules
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister()
      }
    }).catch(() => {})
  } else {
    registerSW({
      immediate: true,
      onNeedRefresh() {},
      onOfflineReady() {}
    })
  }
}

// Automatically recover when Vite rebuilds or updates chunk hashes during development / deployment
const handleChunkModuleError = (event) => {
  try {
    const lastReload = Number(sessionStorage.getItem('chunk-auto-reload-ts') || 0)
    const count = Number(sessionStorage.getItem('chunk-auto-reload-count') || 0)
    const now = Date.now()
    if (now - lastReload < 3000) return
    // At most 2 automatic reloads within a minute. After that stop looping and let the error screen
    // (with its manual Reload button) show, instead of refreshing the whole app every few seconds.
    const withinWindow = now - lastReload < 60000
    if (withinWindow && count >= 2) {
      console.warn('[chunk-recovery] Auto-reload limit reached; not reloading again.')
      return
    }
    sessionStorage.setItem('chunk-auto-reload-ts', String(now))
    sessionStorage.setItem('chunk-auto-reload-count', String(withinWindow ? count + 1 : 1))
  } catch { /* ignore */ }
  window.location.reload()
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  handleChunkModuleError(event)
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason
  const msg = String(reason?.message || reason || '').toLowerCase()
  if (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('dynamically imported module')
  ) {
    event.preventDefault()
    handleChunkModuleError(event)
  }
})

// ─── Branding ────────────────────────────────────────────────────────────────

// Load public business settings (favicon, title, colors) — non-critical
import('./shared/utils/businessSettings.js')
  .then(({ loadBusinessSettings }) => loadBusinessSettings())
  .catch(() => { /* Silently fail — settings load when admin authenticates */ })

function getInitialPathname() {
  if (typeof window === 'undefined') return '/'

  const hash = String(window.location?.hash || '')
  if (hash.startsWith('#/')) {
    return hash.slice(1).split('?')[0] || '/'
  }

  const pathname = String(window.location?.pathname || '/')
  return pathname.replace(/\/index\.html$/i, '') || '/'
}

function isNativeLikeShell() {
  if (typeof window === 'undefined') return false

  const protocol = String(window.location?.protocol || '').toLowerCase()
  const userAgent = String(window.navigator?.userAgent || '').toLowerCase()

  return (
    Boolean(window.flutter_inappwebview) ||
    Boolean(window.ReactNativeWebView) ||
    protocol === 'file:' ||
    userAgent.includes(' wv') ||
    userAgent.includes('; wv')
  )
}

// Entry routes across panels: relaunching soon after leaving with the Home button reopens the page the user was on.
// Exiting with Back always happens from a home screen, which is never restored, so that relaunch starts fresh.
const APP_ENTRY_ROUTES = [
  '/',
  TAXI_USER_HOME,
  '/taxi/driver',
  TAXI_DRIVER_HOME,
  '/driver',
  '/taxi/owner',
  TAXI_OWNER_HOME,
  '/owner',
  '/taxi/admin',
  TAXI_ADMIN_HOME,
  '/admin',
]
const RESUME_LAST_ROUTE_MAX_AGE_MS = 30 * 60 * 1000

function getHomeRouteForResuming(resumeRoute) {
  if (resumeRoute.startsWith('/taxi/driver')) return TAXI_DRIVER_HOME
  if (resumeRoute.startsWith('/taxi/owner')) return TAXI_OWNER_HOME
  if (resumeRoute.startsWith('/taxi/admin') || resumeRoute.startsWith('/admin')) return TAXI_ADMIN_HOME
  return TAXI_USER_HOME
}

function resolveResumableUserRoute(pathname) {
  const cleanPath = pathname.replace(/\/$/, '') || '/'
  if (!APP_ENTRY_ROUTES.includes(cleanPath)) return ''
  try {
    const storedRoute = String(localStorage.getItem(NATIVE_LAST_ROUTE_KEY) || '').trim()
    const leftAt = Number(localStorage.getItem(NATIVE_LAST_ROUTE_AT_KEY) || 0)
    if (!storedRoute || !leftAt || Date.now() - leftAt > RESUME_LAST_ROUTE_MAX_AGE_MS) return ''

    const storedPath = storedRoute.split('?')[0].replace(/\/$/, '')
    const isInnerPage =
      (storedPath.startsWith('/taxi/user/') ||
        storedPath.startsWith('/taxi/driver/') ||
        storedPath.startsWith('/taxi/owner/')) &&
      !/\/(auth|login|signup|onboarding|verify-otp)(\/|$)/.test(storedPath)
    if (!isInnerPage) return ''

    // Pages that need in-memory router state cannot be rebuilt after a relaunch.
    if (isTransientRoute(storedPath)) return ''

    if (cleanPath === '/') {
      if (storedPath.startsWith('/taxi/driver') && !isModuleAuthenticated('driver')) return ''
      if (storedPath.startsWith('/taxi/owner') && !isModuleAuthenticated('driver')) return ''
      if (storedPath.startsWith('/taxi/user') && !isModuleAuthenticated('user')) return ''
    }

    return storedRoute
  } catch {
    return ''
  }
}

function resolveNativeInitialRoute() {
  if (typeof window === 'undefined') return '/'

  const rawPathname = String(window.location?.pathname || '')
  const pathname = rawPathname.replace(/\/index\.html$/i, '') || '/'

  const storedRoute = String(localStorage.getItem(NATIVE_LAST_ROUTE_KEY) || '').trim()

  if (pathname.startsWith('/taxi/driver')) return TAXI_DRIVER_HOME
  if (pathname.startsWith('/taxi/owner')) return TAXI_OWNER_HOME
  if (pathname.startsWith('/taxi/')) return isTransientRoute(pathname) ? TAXI_USER_HOME : pathname
  if (pathname.startsWith('/driver')) return TAXI_DRIVER_HOME
  if (pathname.startsWith('/owner')) return TAXI_OWNER_HOME
  if (pathname.startsWith('/user')) return `/taxi${pathname}`
  if (pathname.startsWith('/admin')) return `/taxi${pathname}`

  if (isNativeLikeShell()) {
    if (storedRoute) {
      if (storedRoute.startsWith('/taxi/driver')) return TAXI_DRIVER_HOME
      if (storedRoute.startsWith('/taxi/owner')) return TAXI_OWNER_HOME
      if (storedRoute.startsWith('/taxi/')) return isTransientRoute(storedRoute) ? TAXI_USER_HOME : storedRoute
    }

    if (isModuleAuthenticated('driver')) return TAXI_DRIVER_HOME
    if (isModuleAuthenticated('admin')) return TAXI_ADMIN_HOME
    if (isModuleAuthenticated('user')) return TAXI_USER_HOME

    const currentHome = resolveCurrentAppHomeRoute()
    if (currentHome && currentHome !== '/') return currentHome
  } else {
    if (isModuleAuthenticated('driver')) return TAXI_DRIVER_HOME
    if (isModuleAuthenticated('admin')) return TAXI_ADMIN_HOME
  }

  return '/'
}

function bootstrapNativeHashRoute() {
  if (!isNativeLikeShell() || typeof window === 'undefined') return

  const rawPathname = String(window.location?.pathname || '')
  const pathname = rawPathname.replace(/\/index\.html$/i, '') || '/'
  const currentHash = String(window.location?.hash || '')

  // Fresh launch (no hash yet) on an entry route: reopen the page left a moment ago,
  // with home underneath so Back returns home instead of closing the app.
  if (!currentHash.startsWith('#/')) {
    const resumeRoute = resolveResumableUserRoute(pathname)
    if (resumeRoute) {
      const homeRoute = getHomeRouteForResuming(resumeRoute)
      window.history.replaceState(null, '', `#${homeRoute}`)
      window.history.pushState(null, '', `#${resumeRoute}`)
      return
    }
  }

  const targetPath = resolveNativeInitialRoute()
  const search = String(window.location?.search || '')

  // If already at root domain and targetPath is '/', do nothing
  if ((pathname === '/' || pathname === '') && targetPath === '/' && !currentHash.startsWith('#/')) {
    return
  }

  const hashPath = currentHash.startsWith('#') ? currentHash.slice(1).split('?')[0] : ''

  if (currentHash.startsWith('#/')) {
    // A refresh must stay in the panel the user is already in. The hash is the source of truth;
    // the stored "last route" may belong to another panel and must not override it.
    const HASH_PANEL_PREFIXES = ['/taxi/', '/admin', '/login', '/driver', '/owner']
    if (HASH_PANEL_PREFIXES.some((p) => hashPath.startsWith(p))) {
      // Router-state pages cannot be rebuilt after a reload, so fall back to the taxi home.
      if (hashPath.startsWith('/taxi/user/') && isTransientRoute(hashPath)) {
        window.history.replaceState(null, '', `#${TAXI_USER_HOME}`)
      }
      return
    }
    window.history.replaceState(null, '', `#${targetPath}${search}`)
    return
  }

  window.history.replaceState(null, '', `#${targetPath}${search}`)
}

bootstrapNativeHashRoute()
syncThemeForPath(getInitialPathname())

// ─── Suppress known non-critical errors ──────────────────────────────────────

const originalError = console.error
console.error = (...args) => {
  const errorStr = args
    .map(arg => (arg instanceof Error ? `${arg.name}: ${arg.message} ${arg.stack || ''}` : String(arg)))
    .join(' ')

  if (typeof args[0] === 'string' && (
    args[0].includes('chrome-extension://') ||
    args[0].includes('_$initialUrl') ||
    args[0].includes('_$onReInit') ||
    args[0].includes('_$bindListeners') ||
    args[0].includes('simulator.js') ||
    args[0].includes('spoofer.js')
  )) return

  if (
    errorStr.includes('Timeout expired') ||
    errorStr.includes('GeolocationPositionError') ||
    errorStr.includes('Geolocation error') ||
    errorStr.includes('User denied Geolocation') ||
    errorStr.includes('permission denied')
  ) return

  const hasNetworkError = args.some(arg =>
    arg && typeof arg === 'object' &&
    (arg.name === 'AxiosError') &&
    (arg.code === 'ERR_NETWORK' || arg.message === 'Network Error')
  )
  if (hasNetworkError) return

  if (
    errorStr.includes('🌐 Network Error') ||
    errorStr.includes('Network Error - Backend server may not be running') ||
    errorStr.includes('ERR_INTERNET_DISCONNECTED') ||
    errorStr.includes('ERR_NETWORK_CHANGED') ||
    errorStr.includes('fonts.googleapis.com') ||
    errorStr.includes('maps.googleapis.com') ||
    errorStr.includes('Failed to fetch settings') ||
    errorStr.includes('Failed to load services') ||
    (errorStr.includes('ERR_NETWORK') && errorStr.includes('AxiosError'))
  ) return

  if (
    errorStr.includes('xhr poll error') ||
    errorStr.includes('[socket] connect_error') ||
    errorStr.includes('ERR_CONNECTION_REFUSED') ||
    errorStr.includes('Failed to fetch dynamically imported module') ||
    errorStr.includes('Importing a module script failed') ||
    errorStr.includes('Expected length, "undefined"') ||
    (errorStr.includes('attribute cx') && errorStr.includes('Expected length')) ||
    (errorStr.includes('attribute cy') && errorStr.includes('Expected length')) ||
    (errorStr.includes('socket.io') && (errorStr.includes('400 (Bad Request)') || errorStr.includes('500 (Internal Server Error)'))) ||
    (errorStr.includes('WebSocket connection to') && errorStr.includes('socket.io') && errorStr.includes('failed')) ||
    errorStr.includes('WebSocket is closed before the connection is established') ||
    errorStr.includes('reason: \'transport close\'') ||
    errorStr.includes('reason: \'io client disconnect\'') ||
    errorStr.includes('fcmregistrations.googleapis.com') ||
    errorStr.includes('messaging/token-unsubscribe-failed') ||
    errorStr.includes('messaging/token-subscribe-failed') ||
    errorStr.includes('FCM Web Push')
  ) return

  originalError.apply(console, args)
}

const originalWarn = console.warn
console.warn = (...args) => {
  const warnStr = args.join(' ')
  if (
    warnStr.includes('Slow network is detected') ||
    warnStr.includes('Fallback font will be used') ||
    warnStr.includes('Download the React DevTools') ||
    warnStr.includes('Failed to load Google Maps script') ||
    (warnStr.includes('attribute cx') && warnStr.includes('Expected length')) ||
    (warnStr.includes('attribute cy') && warnStr.includes('Expected length')) ||
    warnStr.includes('messaging/token-unsubscribe-failed') ||
    warnStr.includes('token-unsubscribe-failed') ||
    warnStr.includes('fcmregistrations.googleapis.com') ||
    warnStr.includes('The caller does not have permission')
  ) return
  originalWarn.apply(console, args)
}

window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason || event
  const errorMsg = error?.message || String(error) || ''
  const errorName = error?.name || ''
  if (
    errorMsg.includes('Timeout expired') ||
    errorMsg.includes('User denied Geolocation') ||
    errorMsg.includes('permission denied') ||
    errorMsg.includes('ERR_INTERNET_DISCONNECTED') ||
    errorMsg.includes('ERR_NETWORK_CHANGED') ||
    errorMsg.includes('fonts.googleapis.com') ||
    errorMsg.includes('messaging/token-unsubscribe-failed') ||
    errorMsg.includes('token-unsubscribe-failed') ||
    errorMsg.includes('fcmregistrations.googleapis.com') ||
    errorMsg.includes('The caller does not have permission') ||
    errorName === 'GeolocationPositionError'
  ) {
    event.preventDefault()
    return
  }
})

// ─────────────────────────────────────────────────────────────────────────────

import { AppProviders } from './app/providers.jsx'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <AppProviders>
    <App />
  </AppProviders>
)
