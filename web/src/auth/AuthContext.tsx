import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { login as apiLogin, getProfile, type UserData } from '../api/auth'

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

export type AuthContextValue = {
  user: UserData | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<UserData | null>
  signOut: () => void
  loadProfile: () => Promise<void>
  getToken: () => string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getToken = useCallback(() => localStorage.getItem(ACCESS_KEY), [])

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiLogin(email, password)
      localStorage.setItem(ACCESS_KEY, data.access_token)
      localStorage.setItem(REFRESH_KEY, data.refresh_token)
      // Login payload is minimal; profile adds account + role (needed for /account/:id routes).
      const profile = await getProfile(data.access_token)
      setUser(profile)
      return profile
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const loadProfile = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    try {
      const profile = await getProfile(token)
      setUser(profile)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  const signOut = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    setUser(null)
  }, [])

  useEffect(() => {
    if (getToken()) {
      loadProfile()
    }
  }, [getToken, loadProfile])

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      signIn,
      signOut,
      loadProfile,
      getToken,
    }),
    [user, loading, error, signIn, signOut, loadProfile, getToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
