import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Suspense, useEffect } from 'react'
import { toast } from 'sonner'
import SmartRouteSkeleton from '../shared/components/skeletons/SmartRouteSkeleton'
import {
  NATIVE_LAST_ROUTE_AT_KEY,
  NATIVE_LAST_ROUTE_KEY,
  TAXI_ADMIN_HOME,
  isTransientRoute,
  resolveCurrentAppHomeRoute,
  syncActiveModule,
} from '../shared/utils/activeModule.js'
import lazyWithRetry from '../shared/utils/lazyWithRetry.js'

const TaxiApp = lazyWithRetry(() => import('../modules/Taxi/TaxiApp'))
const LandingPage = lazyWithRetry(() => import('../modules/Taxi/modules/shared/pages/LandingPage'))

const PageLoader = () => <SmartRouteSkeleton />

// Keep the screen calm (no skeleton flash) while the admin chunk mounts.
const AdminSwitchFallback = () => <div className="min-h-screen bg-neutral-100" />

const TaxiAppWrapper = () => {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/taxi/admin')
  return (
    <Suspense fallback={isAdmin ? <AdminSwitchFallback /> : <PageLoader />}>
      <TaxiApp />
    </Suspense>
  )
}

// Short legacy paths (/driver/..., /owner/..., /admin/...) map onto their /taxi/... panels.
const RedirectToTaxi = ({ prefix, fallback }) => {
  const location = useLocation()
  const subpath = location.pathname.replace(new RegExp(`^/${prefix}`), '') || ''
  return <Navigate to={`${fallback}${subpath}${location.search}`} replace />
}

const RootLandingOrAppRedirect = () => {
  const home = resolveCurrentAppHomeRoute('/')
  if (home && home !== '/') {
    return <Navigate to={home} replace />
  }
  return (
    <Suspense fallback={<PageLoader />}>
      <LandingPage />
    </Suspense>
  )
}

const SmartFallbackRedirect = () => {
  const location = useLocation()
  const pathname = location.pathname.toLowerCase()

  if (pathname.startsWith('/taxi/driver') || pathname.startsWith('/driver')) {
    return <Navigate to="/taxi/driver/home" replace />
  }
  if (pathname.startsWith('/taxi/owner') || pathname.startsWith('/owner')) {
    return <Navigate to="/taxi/owner/dashboard" replace />
  }
  if (pathname.startsWith('/taxi/admin') || pathname.startsWith('/admin')) {
    return <Navigate to={TAXI_ADMIN_HOME} replace />
  }
  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    return <Navigate to="/taxi/user/login" replace />
  }

  const home = resolveCurrentAppHomeRoute(pathname)
  return <Navigate to={home && home !== '/' ? home : '/taxi/user'} replace />
}

const AppRoutes = () => {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const handleGlobalAuthStale = (event) => {
      const currentPath = String(window.location.pathname || '').toLowerCase()
      // Do not trigger session expired error or forced login redirect if already on login, onboarding or a policy page
      if (
        currentPath.includes('/auth/') ||
        currentPath.includes('/login') ||
        currentPath.includes('/onboarding') ||
        currentPath.includes('/pending-verification') ||
        currentPath.includes('/terms') ||
        currentPath.includes('/privacy') ||
        currentPath === '/refund' ||
        currentPath === '/shipping' ||
        currentPath === '/cancellation' ||
        currentPath === '/about'
      ) {
        return
      }

      const role = String(event.detail?.role || 'user').toLowerCase()
      if (role === 'admin') {
        navigate('/taxi/admin/login', { replace: true })
      } else if (['driver', 'owner', 'bus_driver', 'service_center', 'service_center_staff'].includes(role)) {
        navigate(role === 'owner' ? '/taxi/owner/login' : '/taxi/driver/login', { replace: true })
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('userToken')
        localStorage.removeItem('user_accessToken')
        localStorage.removeItem('user_authenticated')
        localStorage.removeItem('user_user')
        localStorage.removeItem('userInfo')
        toast.error('Session expired. Please log in again.')
        navigate('/taxi/user/login', { replace: true })
      }
    }

    window.addEventListener('app:auth-stale', handleGlobalAuthStale)
    return () => window.removeEventListener('app:auth-stale', handleGlobalAuthStale)
  }, [navigate])

  useEffect(() => {
    syncActiveModule(location.pathname)
  }, [location.pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const protocol = String(window.location?.protocol || '').toLowerCase()
    const userAgent = String(window.navigator?.userAgent || '').toLowerCase()
    const isNativeLikeShell =
      Boolean(window.flutter_inappwebview) ||
      Boolean(window.ReactNativeWebView) ||
      protocol === 'file:' ||
      userAgent.includes(' wv') ||
      userAgent.includes('; wv')

    if (!isNativeLikeShell) return

    const route = `${location.pathname || ''}${location.search || ''}`

    // Do NOT persist transient ride-flow routes that rely on React Router state.
    // If the app reopens on these pages the state is lost, showing stale data.
    if (isTransientRoute(route)) return

    if (
      route.startsWith('/taxi/') ||
      route.startsWith('/admin') ||
      route.startsWith('/driver') ||
      route.startsWith('/owner')
    ) {
      localStorage.setItem(NATIVE_LAST_ROUTE_KEY, route)
      localStorage.setItem(NATIVE_LAST_ROUTE_AT_KEY, String(Date.now()))
    }
  }, [location.pathname, location.search])

  // Leaving the app with the Home button: remember when, so a relaunch soon after reopens this page.
  useEffect(() => {
    const markLeftAt = () => {
      if (document.visibilityState === 'hidden') {
        try {
          if (localStorage.getItem(NATIVE_LAST_ROUTE_KEY)) {
            localStorage.setItem(NATIVE_LAST_ROUTE_AT_KEY, String(Date.now()))
          }
        } catch { /* ignore storage errors */ }
      }
    }
    document.addEventListener('visibilitychange', markLeftAt)
    window.addEventListener('pagehide', markLeftAt)
    return () => {
      document.removeEventListener('visibilitychange', markLeftAt)
      window.removeEventListener('pagehide', markLeftAt)
    }
  }, [])

  return (
    <Routes>
      <Route path="/" element={<RootLandingOrAppRedirect />} />
      <Route path="/landing" element={<Suspense fallback={<PageLoader />}><LandingPage /></Suspense>} />
      <Route path="/login/*" element={<Navigate to="/taxi/user/login" replace />} />
      <Route path="/terms" element={<Navigate to="/taxi/terms" replace />} />
      <Route path="/privacy" element={<Navigate to="/taxi/privacy" replace />} />
      <Route path="/refund" element={<Navigate to="/taxi/refund" replace />} />
      <Route path="/cancellation" element={<Navigate to="/taxi/cancellation" replace />} />
      <Route path="/about" element={<Navigate to="/taxi/about" replace />} />
      <Route path="/taxi/*" element={<TaxiAppWrapper />} />
      <Route path="/admin/*" element={<RedirectToTaxi prefix="admin" fallback="/taxi/admin" />} />
      <Route path="/driver/*" element={<RedirectToTaxi prefix="driver" fallback="/taxi/driver" />} />
      <Route path="/owner/*" element={<RedirectToTaxi prefix="owner" fallback="/taxi/owner" />} />
      <Route path="/user/*" element={<RedirectToTaxi prefix="user" fallback="/taxi/user" />} />
      <Route path="*" element={<SmartFallbackRedirect />} />
    </Routes>
  )
}

export default AppRoutes
