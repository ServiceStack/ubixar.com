/**
 * Generations Store Slice
 *
 * Manages workflow generations and thread generations
 */

import { StateCreator } from 'zustand'
import { WorkflowGeneration } from '../../dtos'
import { generationService } from '../../services'

export interface GenerationsState {
  generations: WorkflowGeneration[]
  threadGenerations: Map<number, WorkflowGeneration[]>
  loading: boolean
  error: string | null
}

export interface GenerationsActions {
  loadGenerations: () => Promise<void>
  loadThreadGenerations: (threadId: number) => Promise<void>
  addGenerations: (generations: WorkflowGeneration[]) => void
  setGenerations: (generations: WorkflowGeneration[]) => void
  clearGenerations: () => void
}

export type GenerationsSlice = GenerationsState & GenerationsActions

export const createGenerationsSlice: StateCreator<GenerationsSlice> = (set, get) => ({
  // State
  generations: [],
  threadGenerations: new Map(),
  loading: false,
  error: null,

  // Actions
  loadGenerations: async () => {
    set({ loading: true, error: null })
    try {
      const result = await generationService.getAll()
      if (result.succeeded && result.response?.results) {
        set({ generations: result.response.results, loading: false })
      } else {
        set({ error: 'Failed to load generations', loading: false })
      }
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  loadThreadGenerations: async (threadId) => {
    try {
      const result = await generationService.getByThread(threadId)
      if (result.succeeded && result.response?.results) {
        const threadGenerations = new Map(get().threadGenerations)
        threadGenerations.set(threadId, result.response.results)
        set({ threadGenerations })
      }
    } catch (error) {
      console.error('Failed to load thread generations:', error)
    }
  },

  addGenerations: (newGenerations) => {
    const existing = get().generations
    const merged = [...existing]

    newGenerations.forEach((newGen) => {
      const index = merged.findIndex((g) => g.id === newGen.id)
      if (index >= 0) {
        merged[index] = newGen
      } else {
        merged.push(newGen)
      }
    })

    set({ generations: merged })
  },

  setGenerations: (generations) => {
    set({ generations })
  },

  clearGenerations: () => {
    set({ generations: [], threadGenerations: new Map() })
  },
})
