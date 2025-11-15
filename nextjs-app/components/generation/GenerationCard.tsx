/**
 * GenerationCard Component
 *
 * Display card for a single workflow generation
 */

'use client'

import Link from 'next/link'
import { WorkflowGeneration } from '@/lib/dtos'

interface GenerationCardProps {
  generation: WorkflowGeneration
}

export function GenerationCard({ generation }: GenerationCardProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'Failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'Running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'Queued':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  return (
    <Link
      href={`/generations/${generation.id}`}
      className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition p-4"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Generation #{generation.id}
        </h3>
        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(generation.status)}`}>
          {generation.status}
        </span>
      </div>

      {generation.request && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
          {typeof generation.request === 'string'
            ? generation.request
            : JSON.stringify(generation.request).substring(0, 100)}
        </p>
      )}

      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
        <span>{new Date(generation.createdDate || '').toLocaleDateString()}</span>
        {generation.durationMs && (
          <span>{(generation.durationMs / 1000).toFixed(1)}s</span>
        )}
      </div>
    </Link>
  )
}
