/**
 * Artifact Service Layer
 *
 * Handles all artifact-related API calls including:
 * - Querying artifacts
 * - Managing artifact reactions
 * - Filtering by ratings
 */

import { apiClient } from '../api-client'
import {
  QueryArtifacts,
  QueryResponse,
  Artifact,
} from '../dtos'
import { ApiResult } from '@servicestack/client'

export const artifactService = {
  /**
   * Query artifacts with optional filtering and pagination
   */
  async query(request: QueryArtifacts): Promise<ApiResult<QueryResponse<Artifact>>> {
    return await apiClient.api(request)
  },

  /**
   * Get all artifacts
   */
  async getAll(): Promise<ApiResult<QueryResponse<Artifact>>> {
    return await apiClient.api(new QueryArtifacts())
  },

  /**
   * Get artifacts by rating
   */
  async getByRating(rating: string): Promise<ApiResult<QueryResponse<Artifact>>> {
    return await apiClient.api(
      new QueryArtifacts({
        // Add rating filter parameters as needed
      })
    )
  },

  /**
   * Get featured artifacts
   */
  async getFeatured(): Promise<ApiResult<QueryResponse<Artifact>>> {
    return await apiClient.api(
      new QueryArtifacts({
        // Add featured filter parameters
      })
    )
  },
}
