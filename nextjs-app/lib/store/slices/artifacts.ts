/**
 * Artifacts Store Slice
 *
 * Manages artifacts, reactions, and filtering
 */

import { StateCreator } from 'zustand'
import { Artifact } from '../../dtos'
import { artifactService } from '../../services'

export interface ArtifactsState {
  artifacts: Artifact[]
  featuredArtifacts: Artifact[]
  selectedRatings: string[]
  loading: boolean
  error: string | null
}

export interface ArtifactsActions {
  loadArtifacts: () => Promise<void>
  loadFeatured: () => Promise<void>
  setArtifacts: (artifacts: Artifact[]) => void
  addArtifacts: (artifacts: Artifact[]) => void
  removeArtifact: (id: number) => void
  setSelectedRatings: (ratings: string[]) => void
  clearArtifacts: () => void
}

export type ArtifactsSlice = ArtifactsState & ArtifactsActions

export const createArtifactsSlice: StateCreator<ArtifactsSlice> = (set, get) => ({
  // State
  artifacts: [],
  featuredArtifacts: [],
  selectedRatings: ['PG', 'PG-13'],
  loading: false,
  error: null,

  // Actions
  loadArtifacts: async () => {
    set({ loading: true, error: null })
    try {
      const result = await artifactService.getAll()
      if (result.succeeded && result.response?.results) {
        set({ artifacts: result.response.results, loading: false })
      } else {
        set({ error: 'Failed to load artifacts', loading: false })
      }
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  loadFeatured: async () => {
    try {
      const result = await artifactService.getFeatured()
      if (result.succeeded && result.response?.results) {
        set({ featuredArtifacts: result.response.results })
      }
    } catch (error) {
      console.error('Failed to load featured artifacts:', error)
    }
  },

  setArtifacts: (artifacts) => {
    set({ artifacts })
  },

  addArtifacts: (newArtifacts) => {
    const existing = get().artifacts
    const merged = [...existing]

    newArtifacts.forEach((newArt) => {
      const index = merged.findIndex((a) => a.id === newArt.id)
      if (index >= 0) {
        merged[index] = newArt
      } else {
        merged.push(newArt)
      }
    })

    set({ artifacts: merged })
  },

  removeArtifact: (id) => {
    const artifacts = get().artifacts.filter((a) => a.id !== id)
    set({ artifacts })
  },

  setSelectedRatings: (ratings) => {
    set({ selectedRatings: ratings })
  },

  clearArtifacts: () => {
    set({ artifacts: [], featuredArtifacts: [] })
  },
})
