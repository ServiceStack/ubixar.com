/**
 * Thread Service Layer
 *
 * Handles all thread-related API calls including:
 * - Creating, updating, and deleting threads
 * - Querying user threads
 * - Managing thread reactions
 */

import { apiClient } from '../api-client'
import {
  CreateThread,
  UpdateThread,
  DeleteThread,
  Thread,
} from '../dtos'
import { ApiResult } from '@servicestack/client'

export const threadService = {
  /**
   * Create a new thread
   */
  async create(thread: Partial<Thread>): Promise<ApiResult<Thread>> {
    return await apiClient.api(new CreateThread(thread))
  },

  /**
   * Update an existing thread
   */
  async update(id: number, updates: Partial<Thread>): Promise<ApiResult<Thread>> {
    return await apiClient.api(
      new UpdateThread({
        id,
        ...updates,
      })
    )
  },

  /**
   * Delete a thread
   */
  async delete(id: number): Promise<ApiResult<void>> {
    return await apiClient.api(new DeleteThread({ id }))
  },
}
