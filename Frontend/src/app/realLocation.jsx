import { createContext, useContext } from 'react'
import { UNSAFE_LocationContext as LocationContext } from 'react-router-dom'

// The admin panel is served at /admin but its routes are declared under /taxi/admin.
// Routing is matched against a "/taxi"-prefixed location, while the rest of the app
// should keep seeing the real browser location. These helpers restore it.
export const RealLocationContext = createContext(null)

export const RestoreRealLocation = ({ children }) => {
  const real = useContext(RealLocationContext)
  const current = useContext(LocationContext)
  if (!real || !current) return children
  return (
    <LocationContext.Provider value={{ ...current, location: real }}>
      {children}
    </LocationContext.Provider>
  )
}

export const RestoreRealLocationOutlet = ({ Outlet }) => (
  <RestoreRealLocation>
    <Outlet />
  </RestoreRealLocation>
)
