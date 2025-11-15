/**
 * Workflow Service Layer
 *
 * Handles all workflow-related API calls including:
 * - Querying workflows and workflow versions
 * - Queueing workflow executions
 * - Managing workflow metadata
 */

import { apiClient } from '../api-client'
import {
  QueryWorkflows,
  QueueWorkflow,
  QueueWorkflowResponse,
  QueryResponse,
  Workflow,
} from '../dtos'
import { ApiResult } from '@servicestack/client'

export const workflowService = {
  /**
   * Query workflows with optional filtering and pagination
   */
  async query(request: QueryWorkflows): Promise<ApiResult<QueryResponse<Workflow>>> {
    return await apiClient.api(request)
  },

  /**
   * Queue a workflow for execution
   */
  async queue(request: QueueWorkflow): Promise<ApiResult<QueueWorkflowResponse>> {
    return await apiClient.post(request)
  },

  /**
   * Get all available workflows
   */
  async getAll(): Promise<ApiResult<QueryResponse<Workflow>>> {
    return await apiClient.api(new QueryWorkflows())
  },

  /**
   * Get a specific workflow by ID
   */
  async getById(id: number): Promise<Workflow | null> {
    const result = await apiClient.api(new QueryWorkflows({ id }))
    if (result.succeeded && result.response?.results?.length > 0) {
      return result.response.results[0]
    }
    return null
  },
}
