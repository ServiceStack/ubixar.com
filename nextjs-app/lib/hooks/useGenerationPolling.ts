/**
 * useGenerationPolling Hook
 *
 * Implements real-time polling for workflow generation updates
 */

'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import { generationService } from '../services'
import { getLastModified } from '../db'

export function useGenerationPolling(enabled: boolean, threadId?: number) {
  const activeRef = useRef(false)
  const addGenerations = useStore((state) => state.addGenerations)
  const user = useStore((state) => state.user)

  useEffect(() => {
    if (!enabled || !user) {
      activeRef.current = false
      return
    }

    activeRef.current = true

    const poll = async () => {
      while (activeRef.current) {
        try {
          // Get last modified date from IndexedDB
          const afterModifiedDate = await getLastModified('WorkflowGeneration', user.userId)

          // Long-poll for updates
          const result = await generationService.waitForUpdates(
            afterModifiedDate,
            threadId
          )

          if (result.succeeded && result.response?.results?.length) {
            // Add new/updated generations to store
            addGenerations(result.response.results)
          }
        } catch (error) {
          console.error('Polling error:', error)
          // Wait 5 seconds before retrying on error
          await new Promise((resolve) => setTimeout(resolve, 5000))
        }
      }
    }

    poll()

    return () => {
      activeRef.current = false
    }
  }, [enabled, threadId, user, addGenerations])

  return {
    polling: activeRef.current,
  }
}
