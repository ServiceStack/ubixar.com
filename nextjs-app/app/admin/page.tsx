/**
 * Admin Page
 *
 * Admin dashboard for device and workflow management
 * Requires Admin role
 */

'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { authService } from '@/lib/services'

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(true)

  const { isAuthenticated, isAdmin } = useStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    isAdmin: state.isAdmin,
  }))

  useEffect(() => {
    const checkAuth = async () => {
      const session = await authService.getSession()
      if (!session) {
        authService.signIn('/admin')
        return
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-400">
          You must be an administrator to access this page.
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-accent-2 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Device Management</h2>
          <p className="text-gray-400">Manage device pool and compatibility</p>
        </div>

        <div className="bg-accent-2 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Workflow Management</h2>
          <p className="text-gray-400">Manage workflow versions and settings</p>
        </div>

        <div className="bg-accent-2 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Featured Artifacts</h2>
          <p className="text-gray-400">Feature or unfeature artifacts</p>
        </div>

        <div className="bg-accent-2 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <p className="text-gray-400">View system health and statistics</p>
        </div>
      </div>
    </div>
  )
}
