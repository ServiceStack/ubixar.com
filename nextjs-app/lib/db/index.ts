/**
 * IndexedDB Cache Layer
 *
 * Provides offline-first data caching using IndexedDB with two databases:
 * - ComfyApp: Application-wide data (workflows, artifacts, assets)
 * - ComfyUser: User-specific data (generations, threads, reactions)
 *
 * This implementation matches the Vue app's caching strategy.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb'
import {
  Workflow,
  WorkflowGeneration,
  Thread,
  Artifact,
} from '../dtos'

/**
 * App Database Schema (ComfyApp)
 * Contains public/shared data
 */
interface AppDB extends DBSchema {
  Workflow: {
    key: number
    value: Workflow
    indexes: { byModifiedDate: string }
  }
  Artifact: {
    key: number
    value: Artifact
    indexes: { byModifiedDate: string }
  }
  Cache: {
    key: string
    value: {
      key: string
      value: any
      timestamp: number
    }
  }
  DeletedRow: {
    key: number
    value: {
      id: number
      table: string
      deletedDate: string
    }
  }
}

/**
 * User Database Schema (ComfyUser)
 * Contains user-specific data (requires authentication)
 */
interface UserDB extends DBSchema {
  WorkflowGeneration: {
    key: number
    value: WorkflowGeneration
    indexes: { byModifiedDate: string, byThreadId: number }
  }
  Thread: {
    key: number
    value: Thread
    indexes: { byModifiedDate: string }
  }
}

let appDb: IDBPDatabase<AppDB> | null = null
let userDb: IDBPDatabase<UserDB> | null = null
let currentUserId: string | null = null

/**
 * Open the application database (public data)
 */
export async function openAppDb(): Promise<IDBPDatabase<AppDB>> {
  if (appDb) return appDb

  appDb = await openDB<AppDB>('ComfyApp', 1, {
    upgrade(db) {
      // Workflow store
      if (!db.objectStoreNames.contains('Workflow')) {
        const workflowStore = db.createObjectStore('Workflow', { keyPath: 'id' })
        workflowStore.createIndex('byModifiedDate', 'modifiedDate')
      }

      // Artifact store
      if (!db.objectStoreNames.contains('Artifact')) {
        const artifactStore = db.createObjectStore('Artifact', { keyPath: 'id' })
        artifactStore.createIndex('byModifiedDate', 'modifiedDate')
      }

      // Cache store (for generic caching)
      if (!db.objectStoreNames.contains('Cache')) {
        db.createObjectStore('Cache', { keyPath: 'key' })
      }

      // Deleted rows tracking
      if (!db.objectStoreNames.contains('DeletedRow')) {
        db.createObjectStore('DeletedRow', { keyPath: 'id' })
      }
    },
  })

  return appDb
}

/**
 * Open the user database (user-specific data)
 */
export async function openUserDb(userId: string): Promise<IDBPDatabase<UserDB>> {
  if (userDb && currentUserId === userId) return userDb

  // Close previous user's database if switching users
  if (userDb && currentUserId !== userId) {
    userDb.close()
  }

  currentUserId = userId

  userDb = await openDB<UserDB>(`ComfyUser_${userId}`, 1, {
    upgrade(db) {
      // WorkflowGeneration store
      if (!db.objectStoreNames.contains('WorkflowGeneration')) {
        const genStore = db.createObjectStore('WorkflowGeneration', { keyPath: 'id' })
        genStore.createIndex('byModifiedDate', 'modifiedDate')
        genStore.createIndex('byThreadId', 'threadId')
      }

      // Thread store
      if (!db.objectStoreNames.contains('Thread')) {
        const threadStore = db.createObjectStore('Thread', { keyPath: 'id' })
        threadStore.createIndex('byModifiedDate', 'modifiedDate')
      }
    },
  })

  return userDb
}

/**
 * Clear user database on user change
 */
export async function clearUserDb(userId?: string): Promise<void> {
  if (userDb) {
    userDb.close()
    userDb = null
  }

  if (userId) {
    await indexedDB.deleteDatabase(`ComfyUser_${userId}`)
  }

  currentUserId = null
}

/**
 * Get last modified date for a table (for incremental sync)
 */
export async function getLastModified(table: string, userId?: string): Promise<string | undefined> {
  try {
    if (table === 'Workflow' || table === 'Artifact') {
      const db = await openAppDb()
      const tx = db.transaction(table as any, 'readonly')
      const store = tx.objectStore(table as any)
      const index = store.index('byModifiedDate')
      const cursor = await index.openCursor(null, 'prev')
      return cursor?.value.modifiedDate
    } else if (table === 'WorkflowGeneration' || table === 'Thread') {
      if (!userId) return undefined
      const db = await openUserDb(userId)
      const tx = db.transaction(table as any, 'readonly')
      const store = tx.objectStore(table as any)
      const index = store.index('byModifiedDate')
      const cursor = await index.openCursor(null, 'prev')
      return cursor?.value.modifiedDate
    }
  } catch (error) {
    console.error(`Failed to get last modified for ${table}:`, error)
  }
  return undefined
}

/**
 * Bulk put workflows
 */
export async function putWorkflows(workflows: Workflow[]): Promise<void> {
  const db = await openAppDb()
  const tx = db.transaction('Workflow', 'readwrite')
  await Promise.all(workflows.map((w) => tx.store.put(w)))
  await tx.done
}

/**
 * Get all workflows from cache
 */
export async function getAllWorkflows(): Promise<Workflow[]> {
  const db = await openAppDb()
  return await db.getAll('Workflow')
}

/**
 * Bulk put artifacts
 */
export async function putArtifacts(artifacts: Artifact[]): Promise<void> {
  const db = await openAppDb()
  const tx = db.transaction('Artifact', 'readwrite')
  await Promise.all(artifacts.map((a) => tx.store.put(a)))
  await tx.done
}

/**
 * Get all artifacts from cache
 */
export async function getAllArtifacts(): Promise<Artifact[]> {
  const db = await openAppDb()
  return await db.getAll('Artifact')
}

/**
 * Bulk put generations
 */
export async function putGenerations(userId: string, generations: WorkflowGeneration[]): Promise<void> {
  const db = await openUserDb(userId)
  const tx = db.transaction('WorkflowGeneration', 'readwrite')
  await Promise.all(generations.map((g) => tx.store.put(g)))
  await tx.done
}

/**
 * Get all generations from cache
 */
export async function getAllGenerations(userId: string): Promise<WorkflowGeneration[]> {
  const db = await openUserDb(userId)
  return await db.getAll('WorkflowGeneration')
}

/**
 * Get generations by thread ID
 */
export async function getGenerationsByThread(userId: string, threadId: number): Promise<WorkflowGeneration[]> {
  const db = await openUserDb(userId)
  const index = db.transaction('WorkflowGeneration').store.index('byThreadId')
  return await index.getAll(threadId)
}

/**
 * Bulk put threads
 */
export async function putThreads(userId: string, threads: Thread[]): Promise<void> {
  const db = await openUserDb(userId)
  const tx = db.transaction('Thread', 'readwrite')
  await Promise.all(threads.map((t) => tx.store.put(t)))
  await tx.done
}

/**
 * Get all threads from cache
 */
export async function getAllThreads(userId: string): Promise<Thread[]> {
  const db = await openUserDb(userId)
  return await db.getAll('Thread')
}

/**
 * Delete an item from cache
 */
export async function deleteFromCache(table: string, id: number, userId?: string): Promise<void> {
  try {
    if (table === 'Workflow' || table === 'Artifact') {
      const db = await openAppDb()
      await db.delete(table as any, id)
    } else if (table === 'WorkflowGeneration' || table === 'Thread') {
      if (!userId) return
      const db = await openUserDb(userId)
      await db.delete(table as any, id)
    }
  } catch (error) {
    console.error(`Failed to delete ${table}:${id}:`, error)
  }
}

/**
 * Generic cache operations
 */
export async function cacheSet(key: string, value: any): Promise<void> {
  const db = await openAppDb()
  await db.put('Cache', {
    key,
    value,
    timestamp: Date.now(),
  })
}

export async function cacheGet(key: string): Promise<any> {
  const db = await openAppDb()
  const cached = await db.get('Cache', key)
  return cached?.value
}

export async function cacheDelete(key: string): Promise<void> {
  const db = await openAppDb()
  await db.delete('Cache', key)
}
