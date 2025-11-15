/**
 * User Store Slice
 *
 * Manages user session, authentication state, and preferences
 */

import { StateCreator } from 'zustand'
import { AuthenticateResponse } from '../../dtos'

export interface UserPreferences {
  isOver18: boolean
  sortBy: string
  ratings: string[]
  lastReadNotificationId?: number
  lastReadAchievementId?: number
}

export interface UserState {
  user: AuthenticateResponse | null
  preferences: UserPreferences
  isAuthenticated: boolean
  isAdmin: boolean
}

export interface UserActions {
  setUser: (user: AuthenticateResponse | null) => void
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  clearUser: () => void
}

export type UserSlice = UserState & UserActions

const DEFAULT_PREFERENCES: UserPreferences = {
  isOver18: false,
  sortBy: 'createdDate',
  ratings: ['PG', 'PG-13'],
}

export const createUserSlice: StateCreator<UserSlice> = (set, get) => ({
  // State
  user: null,
  preferences: DEFAULT_PREFERENCES,
  isAuthenticated: false,
  isAdmin: false,

  // Actions
  setUser: (user) => {
    const isAuthenticated = !!user
    const isAdmin = user?.roles?.includes('Admin') ?? false

    set({
      user,
      isAuthenticated,
      isAdmin,
    })

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('gateway:user', JSON.stringify(user))
      } else {
        localStorage.removeItem('gateway:user')
      }
    }
  },

  updatePreferences: (newPreferences) => {
    const preferences = { ...get().preferences, ...newPreferences }
    set({ preferences })

    // Persist to localStorage
    if (typeof window !== 'undefined' && get().user) {
      const username = get().user?.userName || 'default'
      localStorage.setItem(`gateway:${username}:prefs`, JSON.stringify(preferences))
    }
  },

  clearUser: () => {
    set({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      preferences: DEFAULT_PREFERENCES,
    })

    if (typeof window !== 'undefined') {
      localStorage.removeItem('gateway:user')
    }
  },
})
