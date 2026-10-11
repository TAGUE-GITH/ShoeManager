import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { tokens } from '../api/client'
import { authApi } from '../api/resources'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Vrai tant que la session enregistree n'a pas ete verifiee
  const [loading, setLoading] = useState(() => Boolean(tokens.access))

  const logout = useCallback(() => {
    tokens.clear()
    setUser(null)
  }, [])

  useEffect(() => {
    window.addEventListener('auth:logout', logout)
    if (tokens.access) {
      authApi
        .me()
        .then(setUser)
        .catch(logout)
        .finally(() => setLoading(false))
    }
    return () => window.removeEventListener('auth:logout', logout)
  }, [logout])

  const openSession = useCallback((session) => {
    tokens.save(session)
    setUser(session.user)
    return session.user
  }, [])

  const login = useCallback((credentials) => authApi.login(credentials).then(openSession), [openSession])
  const register = useCallback((form) => authApi.register(form).then(openSession), [openSession])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, openSession }),
    [user, loading, login, register, logout, openSession],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return context
}
