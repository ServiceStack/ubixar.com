/**
 * Main Zustand Store
 *
 * Combines all store slices into a single store instance
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createUserSlice, UserSlice } from './slices/user'
import { createWorkflowsSlice, WorkflowsSlice } from './slices/workflows'
import { createGenerationsSlice, GenerationsSlice } from './slices/generations'
import { createThreadsSlice, ThreadsSlice } from './slices/threads'
import { createArtifactsSlice, ArtifactsSlice } from './slices/artifacts'
import { createUISlice, UISlice } from './slices/ui'

/**
 * Combined store type
 */
export type AppStore =
  & UserSlice
  & WorkflowsSlice
  & GenerationsSlice
  & ThreadsSlice
  & ArtifactsSlice
  & UISlice

/**
 * Main application store
 *
 * Usage in components:
 * ```typescript
 * import { useStore } from '@/lib/store'
 *
 * function MyComponent() {
 *   const user = useStore(state => state.user)
 *   const workflows = useStore(state => state.workflows)
 *   const loadWorkflows = useStore(state => state.loadWorkflows)
 *
 *   useEffect(() => {
 *     loadWorkflows()
 *   }, [])
 *
 *   return <div>...</div>
 * }
 * ```
 */
export const useStore = create<AppStore>()(
  devtools(
    (...args) => ({
      ...createUserSlice(...args),
      ...createWorkflowsSlice(...args),
      ...createGenerationsSlice(...args),
      ...createThreadsSlice(...args),
      ...createArtifactsSlice(...args),
      ...createUISlice(...args),
    }),
    {
      name: 'ubixar-store',
    }
  )
)

/**
 * Initialize store with persisted data from localStorage
 */
export function initializeStore() {
  if (typeof window === 'undefined') return

  // Load user from localStorage
  const storedUser = localStorage.getItem('gateway:user')
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser)
      useStore.getState().setUser(user)

      // Load user preferences
      const username = user.userName || 'default'
      const storedPrefs = localStorage.getItem(`gateway:${username}:prefs`)
      if (storedPrefs) {
        const preferences = JSON.parse(storedPrefs)
        useStore.getState().updatePreferences(preferences)
      }
    } catch (error) {
      console.error('Failed to load user from localStorage:', error)
    }
  }
}

/**
 * Clear all store data (for logout)
 */
export function clearStore() {
  const state = useStore.getState()
  state.clearUser()
  state.clearWorkflows()
  state.clearGenerations()
  state.clearThreads()
  state.clearArtifacts()
}
