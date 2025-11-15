/**
 * Generation Service Layer
 *
 * Handles all workflow generation-related API calls including:
 * - Querying user generations
 * - Getting generation details
 * - Publishing generations
 * - Real-time generation polling
 */

import { apiClient } from '../api-client'
import {
  MyWorkflowGenerations,
  GetWorkflowGeneration,
  GetWorkflowGenerationResponse,
  PublishGeneration,
  WaitForMyWorkflowGenerations,
  QueryResponse,
  WorkflowGeneration,
  EmptyResponse,
} from '../dtos'
import { ApiResult } from '@servicestack/client'

export const generationService = {
  /**
   * Query user's workflow generations
   */
  async query(request: MyWorkflowGenerations): Promise<ApiResult<QueryResponse<WorkflowGeneration>>> {
    return await apiClient.api(request)
  },

  /**
   * Get all generations for the current user
   */
  async getAll(): Promise<ApiResult<QueryResponse<WorkflowGeneration>>> {
    return await apiClient.api(new MyWorkflowGenerations())
  },

  /**
   * Get a specific generation by ID
   */
  async getById(id: number): Promise<ApiResult<GetWorkflowGenerationResponse>> {
    return await apiClient.api(new GetWorkflowGeneration({ id }))
  },

  /**
   * Publish a generation (make it public)
   */
  async publish(id: number): Promise<ApiResult<EmptyResponse>> {
    return await apiClient.api(new PublishGeneration({ id }))
  },

  /**
   * Long-polling endpoint to wait for new/updated generations
   * This is used for real-time updates in the UI
   */
  async waitForUpdates(
    afterModifiedDate?: string,
    threadId?: number
  ): Promise<ApiResult<QueryResponse<WorkflowGeneration>>> {
    return await apiClient.api(
      new WaitForMyWorkflowGenerations({
        afterModifiedDate,
        threadId,
      })
    )
  },

  /**
   * Get generations for a specific thread
   */
  async getByThread(threadId: number): Promise<ApiResult<QueryResponse<WorkflowGeneration>>> {
    return await apiClient.api(
      new MyWorkflowGenerations({
        threadId,
      })
    )
  },
}
