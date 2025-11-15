/**
 * Workflows Store Slice
 *
 * Manages workflows, workflow versions, and selected workflow state
 */

import { StateCreator } from 'zustand'
import { Workflow } from '../../dtos'
import { workflowService } from '../../services'

export interface WorkflowsState {
  workflows: Workflow[]
  selectedWorkflow: Workflow | null
  loading: boolean
  error: string | null
}

export interface WorkflowsActions {
  loadWorkflows: () => Promise<void>
  selectWorkflow: (id: number) => void
  setWorkflows: (workflows: Workflow[]) => void
  clearWorkflows: () => void
}

export type WorkflowsSlice = WorkflowsState & WorkflowsActions

export const createWorkflowsSlice: StateCreator<WorkflowsSlice> = (set, get) => ({
  // State
  workflows: [],
  selectedWorkflow: null,
  loading: false,
  error: null,

  // Actions
  loadWorkflows: async () => {
    set({ loading: true, error: null })
    try {
      const result = await workflowService.getAll()
      if (result.succeeded && result.response?.results) {
        set({ workflows: result.response.results, loading: false })
      } else {
        set({ error: 'Failed to load workflows', loading: false })
      }
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  selectWorkflow: (id) => {
    const workflow = get().workflows.find((w) => w.id === id)
    set({ selectedWorkflow: workflow || null })
  },

  setWorkflows: (workflows) => {
    set({ workflows })
  },

  clearWorkflows: () => {
    set({ workflows: [], selectedWorkflow: null })
  },
})
