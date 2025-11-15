/**
 * Store Initializer Component
 *
 * Initializes the Zustand store with persisted data on app load
 */

'use client'

import { useEffect } from 'react'
import { initializeStore } from '@/lib/store'

export function StoreInitializer() {
  useEffect(() => {
    // Initialize store with localStorage data
    initializeStore()
  }, [])

  return null
}
