import type { User } from '@/types'

const TOKEN_KEY = 'sentinel_token'
const USER_KEY = 'sentinel_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? (JSON.parse(raw) as User) : null
}

export function setStoredUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

