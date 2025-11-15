/**
 * Threads Store Slice
 *
 * Manages thread list and selected thread state
 */

import { StateCreator } from 'zustand'
import { Thread } from '../../dtos'
import { threadService } from '../../services'

export interface ThreadsState {
  threads: Thread[]
  selectedThread: Thread | null
  loading: boolean
  error: string | null
}

export interface ThreadsActions {
  createThread: (thread: Partial<Thread>) => Promise<Thread | null>
  updateThread: (id: number, updates: Partial<Thread>) => Promise<void>
  deleteThread: (id: number) => Promise<void>
  selectThread: (thread: Thread | null) => void
  setThreads: (threads: Thread[]) => void
  clearThreads: () => void
}

export type ThreadsSlice = ThreadsState & ThreadsActions

export const createThreadsSlice: StateCreator<ThreadsSlice> = (set, get) => ({
  // State
  threads: [],
  selectedThread: null,
  loading: false,
  error: null,

  // Actions
  createThread: async (thread) => {
    try {
      const result = await threadService.create(thread)
      if (result.succeeded && result.response) {
        const threads = [...get().threads, result.response]
        set({ threads })
        return result.response
      }
      return null
    } catch (error) {
      console.error('Failed to create thread:', error)
      return null
    }
  },

  updateThread: async (id, updates) => {
    try {
      const result = await threadService.update(id, updates)
      if (result.succeeded && result.response) {
        const threads = get().threads.map((t) =>
          t.id === id ? result.response! : t
        )
        set({ threads })
      }
    } catch (error) {
      console.error('Failed to update thread:', error)
    }
  },

  deleteThread: async (id) => {
    try {
      const result = await threadService.delete(id)
      if (result.succeeded) {
        const threads = get().threads.filter((t) => t.id !== id)
        set({ threads })
        if (get().selectedThread?.id === id) {
          set({ selectedThread: null })
        }
      }
    } catch (error) {
      console.error('Failed to delete thread:', error)
    }
  },

  selectThread: (thread) => {
    set({ selectedThread: thread })
  },

  setThreads: (threads) => {
    set({ threads })
  },

  clearThreads: () => {
    set({ threads: [], selectedThread: null })
  },
})
