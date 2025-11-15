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
import { authService, workflowService } from '@/lib/services'
import { Loading, WorkflowSelector, WorkflowPrompt, RecentThreads } from '@/components'
import { useGenerationPolling } from '@/lib/hooks'
import { QueueWorkflow } from '@/lib/dtos'
import { apiClient } from '@/lib/api-client'

export default function GeneratePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showThreads, setShowThreads] = useState(true)

  const {
    isAuthenticated,
    workflows,
    loadWorkflows,
    selectedWorkflow,
    selectWorkflow,
    threads,
    selectedThread,
    selectThread,
    createThread,
  } = useStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    workflows: state.workflows,
    loadWorkflows: state.loadWorkflows,
    selectedWorkflow: state.selectedWorkflow,
    selectWorkflow: state.selectWorkflow,
    threads: state.threads,
    selectedThread: state.selectedThread,
    selectThread: state.selectThread,
    createThread: state.createThread,
  }))

  // Enable real-time polling for generation updates
  useGenerationPolling(isAuthenticated, selectedThread?.id)

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

  const handleSelectWorkflow = (workflow: typeof selectedWorkflow) => {
    if (workflow) {
      selectWorkflow(workflow.id!)
    }
  }

  const handleNewThread = async () => {
    const thread = await createThread({
      name: `Thread ${new Date().toLocaleString()}`,
    })
    if (thread) {
      selectThread(thread)
    }
  }

  const handleSubmit = async (args: Record<string, any>) => {
    if (!selectedWorkflow) return

    setIsGenerating(true)
    try {
      // Create thread if none selected
      let threadId = selectedThread?.id
      if (!threadId) {
        const newThread = await createThread({
          name: `${selectedWorkflow.name} - ${new Date().toLocaleString()}`,
        })
        if (newThread) {
          threadId = newThread.id
          selectThread(newThread)
        }
      }

      // Queue the workflow
      const result = await apiClient.post(
        new QueueWorkflow({
          workflowId: selectedWorkflow.id,
          threadId,
          request: JSON.stringify(args),
        })
      )

      if (result.succeeded) {
        console.log('Workflow queued successfully:', result.response)
        // Polling will automatically pick up the new generation
      } else {
        console.error('Failed to queue workflow:', result.error)
        alert('Failed to queue workflow. Please try again.')
      }
    } catch (error) {
      console.error('Error queuing workflow:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return <Loading message="Checking authentication..." />
  }

  if (!isAuthenticated) {
    return <Loading message="Redirecting to login..." />
  }

  return (
    <div
      className="grid w-full"
      style={{
        minHeight: 'calc(100vh - 56px)',
        gridTemplateColumns: showThreads && threads.length > 0
          ? '22rem 1fr 15rem'
          : threads.length > 0
          ? '22rem 1fr'
          : '25rem 1fr',
      }}
    >
      {/* Left Panel - Workflow Selector */}
      <div className="py-4 px-4 border-r dark:border-gray-700 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Workflows</h2>
          {workflows.length > 0 && selectedWorkflow && (
            <button
              onClick={() => selectWorkflow(0)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Change
            </button>
          )}
        </div>

        {!selectedWorkflow ? (
          <WorkflowSelector
            workflows={workflows}
            selectedWorkflow={selectedWorkflow}
            onSelect={handleSelectWorkflow}
          />
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-blue-600 text-white rounded-lg">
              <h3 className="font-semibold text-lg">{selectedWorkflow.name}</h3>
              {selectedWorkflow.description && (
                <p className="text-sm text-blue-100 mt-1">
                  {selectedWorkflow.description}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Center Panel - Workflow Prompt */}
      <div className="py-4 px-6 overflow-y-auto">
        {selectedWorkflow ? (
          <div>
            <h2 className="text-2xl font-bold mb-6">Configure {selectedWorkflow.name}</h2>
            <WorkflowPrompt
              workflow={selectedWorkflow}
              onSubmit={handleSubmit}
              disabled={isGenerating}
            />

            {isGenerating && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-blue-900 dark:text-blue-100 font-medium">
                    Generating your request...
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <p className="text-lg font-medium">Select a workflow to get started</p>
              <p className="text-sm mt-2">Choose from the available workflows on the left</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Recent Threads (optional) */}
      {threads.length > 0 && showThreads && (
        <div className="border-l dark:border-gray-700 overflow-y-auto">
          <RecentThreads
            threads={threads}
            selectedThread={selectedThread}
            onSelectThread={selectThread}
            onNewThread={handleNewThread}
          />
        </div>
      )}
    </div>
  )
}
