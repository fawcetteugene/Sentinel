import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { clearToken, getStoredUser, setStoredUser, setToken } from '@/lib/auth'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  updateProfile: (payload: Partial<User>) => Promise<User>
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

  async function refresh(options: { preserveOnFailure?: boolean } = {}) {
    try {
      const me = await api.me()
      setUser(me)
      setStoredUser(me)
    } catch {
      if (!options.preserveOnFailure) {
        setUser(null)
      }
    }
  }

  async function login(email: string, password: string) {
    const { access_token } = await api.login(email, password)
    setToken(access_token)
    const provisionalUser = decodeToken(access_token, email)
    setUser(provisionalUser)
    setStoredUser(provisionalUser)
    await refresh({ preserveOnFailure: true })
  }

  async function updateProfile(payload: Partial<User>) {
    const updated = await api.updateMe(payload)
    setUser(updated)
    setStoredUser(updated)
    return updated
  }

  function logout() {
    clearToken()
    setUser(null)
  }

  const value = useMemo<AuthState>(
    () => ({ user, loading, login, updateProfile, logout, refresh }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}

function decodeToken(token: string, fallbackIdentifier: string): User {
  const payload = token.split('.')[1]
  let parsed: { sub?: string; role?: User['role'] } = {}
  try {
    parsed = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: string; role?: User['role'] }
  } catch {
    parsed = {}
  }

  const identifier = parsed.sub || fallbackIdentifier
  const role = parsed.role || 'public_user'
  const now = new Date().toISOString()
  return {
    id: 0,
    email: identifier.includes('@') ? identifier : `${identifier}@local`,
    full_name: identifier,
    role,
    phone_number: identifier.startsWith('+') ? identifier : null,
    username: identifier.includes('@') ? identifier.split('@')[0] : identifier,
    village: null,
    skills: [],
    badge_id: null,
    avatar_url: null,
    is_active: true,
    is_on_duty: true,
    created_at: now,
    updated_at: now,
  }
}
