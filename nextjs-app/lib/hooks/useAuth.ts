/**
 * useAuth Hook
 *
 * Provides authentication state and helpers
 */

'use client'

import { useStore } from '../store'

export function useAuth() {
  const user = useStore((state) => state.user)
  const isAuthenticated = useStore((state) => state.isAuthenticated)
  const isAdmin = useStore((state) => state.isAdmin)

  return {
    user,
    isAuthenticated,
    isAdmin,
    roles: user?.roles || [],
  }
}
