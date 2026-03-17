import { useState, useCallback } from 'react'
import { login as apiLogin, getProfile, type UserData } from '../api/auth'

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

export function useAuth() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getToken = () => localStorage.getItem(ACCESS_KEY)

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiLogin(email, password)
      localStorage.setItem(ACCESS_KEY, data.access_token)
      localStorage.setItem(REFRESH_KEY, data.refresh_token)
      setUser(data.user)
      return true
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed')
      return false
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
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    setUser(null)
  }, [])

  return { user, loading, error, signIn, signOut, loadProfile, getToken }
}
