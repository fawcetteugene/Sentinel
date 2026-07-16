import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { clearToken, getStoredUser, setStoredUser, setToken } from '@/lib/auth'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void refresh().finally(() => setLoading(false))
  }, [])

  async function refresh() {
    try {
      const me = await api.me()
      setUser(me)
      setStoredUser(me)
    } catch {
      setUser(null)
    }
  }

  async function login(email: string, password: string) {
    const { access_token } = await api.login(email, password)
    setToken(access_token)
    await refresh()
  }

  function logout() {
    clearToken()
    setUser(null)
  }

  const value = useMemo<AuthState>(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
