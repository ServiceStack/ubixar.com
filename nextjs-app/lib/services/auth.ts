/**
 * Authentication Service Layer
 *
 * Handles authentication-related functionality including:
 * - Checking authentication status
 * - Sign in/out redirects
 * - User session management
 */

import { apiClient } from '../api-client'
import { Authenticate, AuthenticateResponse } from '../dtos'
import { ApiResult } from '@servicestack/client'

export const authService = {
  /**
   * Check if the user is authenticated by calling the Authenticate endpoint
   */
  async checkAuth(): Promise<ApiResult<AuthenticateResponse>> {
    try {
      return await apiClient.api(new Authenticate())
    } catch (error) {
      // Return failed result on error
      return {
        succeeded: false,
        failed: true,
        error: error as any,
      } as ApiResult<AuthenticateResponse>
    }
  },

  /**
   * Get current authentication status from the ServiceStack session
   */
  async getSession(): Promise<AuthenticateResponse | null> {
    const result = await this.checkAuth()
    if (result.succeeded && result.response) {
      return result.response
    }
    return null
  },

  /**
   * Redirect to sign-in page (handled by C# backend)
   */
  signIn(returnUrl?: string): void {
    if (typeof window !== 'undefined') {
      const url = returnUrl || window.location.pathname
      window.location.href = `/Account/Login?returnUrl=${encodeURIComponent(url)}`
    }
  },

  /**
   * Redirect to sign-out endpoint (handled by C# backend)
   */
  signOut(): void {
    if (typeof window !== 'undefined') {
      window.location.href = '/Account/Logout'
    }
  },

  /**
   * Check if user has a specific role
   */
  hasRole(roles: string[] | undefined, role: string): boolean {
    return roles?.includes(role) ?? false
  },

  /**
   * Check if user is admin
   */
  isAdmin(roles: string[] | undefined): boolean {
    return this.hasRole(roles, 'Admin')
  },
}
