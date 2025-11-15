/**
 * RecentThreads Component
 *
 * Sidebar component showing recent conversation threads
 */

'use client'

import { Thread } from '@/lib/dtos'

interface RecentThreadsProps {
  threads: Thread[]
  selectedThread: Thread | null
  onSelectThread: (thread: Thread) => void
  onNewThread: () => void
}

export function RecentThreads({
  threads,
  selectedThread,
  onSelectThread,
  onNewThread,
}: RecentThreadsProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b dark:border-gray-700">
        <button
          onClick={onNewThread}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Thread
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            No recent threads
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => onSelectThread(thread)}
                className={`p-3 rounded cursor-pointer transition ${
                  selectedThread?.id === thread.id
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="font-medium text-sm truncate">
                  {thread.name || `Thread #${thread.id}`}
                </div>
                {thread.description && (
                  <div className={`text-xs mt-1 truncate ${
                    selectedThread?.id === thread.id
                      ? 'text-blue-100'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {thread.description}
                  </div>
                )}
                <div className={`text-xs mt-1 ${
                  selectedThread?.id === thread.id
                    ? 'text-blue-100'
                    : 'text-gray-400'
                }`}>
                  {new Date(thread.createdDate || '').toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
