/**
 * UI Store Slice
 *
 * Manages UI state including modals, loading states, and notifications
 */

import { StateCreator } from 'zustand'

export interface UIState {
  isGenerating: boolean
  showQueuedPopup: boolean
  activeModal: string | null
  toastMessage: string | null
}

export interface UIActions {
  setGenerating: (isGenerating: boolean) => void
  setShowQueuedPopup: (show: boolean) => void
  openModal: (modalId: string) => void
  closeModal: () => void
  showToast: (message: string) => void
  clearToast: () => void
}

export type UISlice = UIState & UIActions

export const createUISlice: StateCreator<UISlice> = (set) => ({
  // State
  isGenerating: false,
  showQueuedPopup: false,
  activeModal: null,
  toastMessage: null,

  // Actions
  setGenerating: (isGenerating) => {
    set({ isGenerating })
  },

  setShowQueuedPopup: (show) => {
    set({ showQueuedPopup: show })
  },

  openModal: (modalId) => {
    set({ activeModal: modalId })
  },

  closeModal: () => {
    set({ activeModal: null })
  },

  showToast: (message) => {
    set({ toastMessage: message })
  },

  clearToast: () => {
    set({ toastMessage: null })
  },
})
