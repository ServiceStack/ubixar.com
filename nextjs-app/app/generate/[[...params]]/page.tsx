/**
 * Generate Page
 *
 * Main workflow execution page with:
 * - Workflow selector
 * - Prompt inputs
 * - Device selector
 * - Run button
 * - Real-time generation polling
 */

'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { authService } from '@/lib/services'

export default function GeneratePage() {
  const [isLoading, setIsLoading] = useState(true)

  const { isAuthenticated, workflows, loadWorkflows, selectedWorkflow } = useStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    workflows: state.workflows,
    loadWorkflows: state.loadWorkflows,
    selectedWorkflow: state.selectedWorkflow,
  }))

  useEffect(() => {
    const checkAuth = async () => {
      const session = await authService.getSession()
      if (!session) {
        authService.signIn('/generate')
        return
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated && workflows.length === 0) {
      loadWorkflows()
    }
  }, [isAuthenticated, workflows.length, loadWorkflows])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Redirecting to login...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Generate</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Workflow Selector */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold mb-4">Select Workflow</h2>
          <div className="space-y-4">
            {workflows.length === 0 ? (
              <p className="text-gray-400">Loading workflows...</p>
            ) : (
              workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className={`p-4 rounded-lg cursor-pointer transition ${
                    selectedWorkflow?.id === workflow.id
                      ? 'bg-blue-600'
                      : 'bg-accent-2 hover:bg-accent-1'
                  }`}
                >
                  <h3 className="font-semibold">{workflow.name}</h3>
                  <p className="text-sm text-gray-400">{workflow.description}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Workflow Prompt Form */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Workflow Settings</h2>
          {selectedWorkflow ? (
            <div className="space-y-4">
              <p className="text-gray-400">
                Configure {selectedWorkflow.name} workflow settings
              </p>
              {/* Workflow prompt form will go here */}
            </div>
          ) : (
            <p className="text-gray-400">Select a workflow to get started</p>
          )}
        </div>
      </div>
    </div>
  )
}
