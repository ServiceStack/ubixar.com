/**
 * WorkflowSelector Component
 *
 * Grid of workflow cards for selection
 */

'use client'

import { Workflow } from '@/lib/dtos'

interface WorkflowSelectorProps {
  workflows: Workflow[]
  selectedWorkflow: Workflow | null
  onSelect: (workflow: Workflow) => void
}

export function WorkflowSelector({ workflows, selectedWorkflow, onSelect }: WorkflowSelectorProps) {
  if (workflows.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No workflows available
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {workflows.map((workflow) => (
        <div
          key={workflow.id}
          onClick={() => onSelect(workflow)}
          className={`p-4 rounded-lg cursor-pointer transition ${
            selectedWorkflow?.id === workflow.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <h3 className="font-semibold text-lg mb-1">{workflow.name}</h3>
          {workflow.description && (
            <p className={`text-sm ${
              selectedWorkflow?.id === workflow.id
                ? 'text-blue-100'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {workflow.description}
            </p>
          )}
          {workflow.tags && workflow.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {workflow.tags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className={`px-2 py-0.5 text-xs rounded ${
                    selectedWorkflow?.id === workflow.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
