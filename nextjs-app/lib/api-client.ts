/**
 * ServiceStack API Client Configuration
 *
 * This module exports a configured JsonServiceClient instance that
 * connects to the C# ServiceStack backend APIs.
 */

import { JsonServiceClient } from '@servicestack/client'

/**
 * Get the base URL for API calls
 * - In development: Uses NEXT_PUBLIC_API_BASE_URL env var or defaults to localhost:5001
 * - In production: Uses the same origin as the frontend (served by C# backend)
 */
function getBaseUrl(): string {
  // Check for explicit API base URL from environment
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL
  }

  // In browser, use current origin (production) or localhost (development)
  if (typeof window !== 'undefined') {
    // If on localhost:3000 (Next.js dev), proxy to C# backend
    if (window.location.hostname === 'localhost' && window.location.port === '3000') {
      return 'https://localhost:5001'
    }
    // Otherwise use same origin
    return window.location.origin
  }

  // SSR/build time fallback (shouldn't happen with static export)
  return 'https://localhost:5001'
}

/**
 * Shared ServiceStack client instance
 *
 * All API calls should use this client to ensure:
 * - Consistent authentication session handling
 * - Proper error handling
 * - Type-safe requests/responses using DTOs
 *
 * Example usage:
 * ```typescript
 * import { apiClient } from '@/lib/api-client'
 * import { QueryWorkflows } from '@/lib/dtos'
 *
 * const response = await apiClient.api(new QueryWorkflows())
 * if (response.succeeded) {
 *   console.log(response.response.results)
 * }
 * ```
 */
export const apiClient = new JsonServiceClient(getBaseUrl())

/**
 * Configure global client settings
 */
apiClient.enableAutoRefreshToken = true
apiClient.bearerToken = undefined // Will be set from cookie-based session

/**
 * Helper to get the current base URL (for debugging)
 */
export const getApiBaseUrl = () => getBaseUrl()
