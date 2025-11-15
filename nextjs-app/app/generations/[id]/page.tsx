/**
 * Generation Detail Page
 *
 * Single generation view with asset gallery and publish actions
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { generationService } from '@/lib/services'
import { WorkflowGeneration } from '@/lib/dtos'

export default function GenerationDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [generation, setGeneration] = useState<WorkflowGeneration | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadGeneration = async () => {
      const result = await generationService.getById(parseInt(id))
      if (result.succeeded && result.response?.result) {
        setGeneration(result.response.result)
      }
      setLoading(false)
    }

    loadGeneration()
  }, [id])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading generation...</p>
      </div>
    )
  }

  if (!generation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Generation not found</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Generation #{generation.id}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Asset gallery will go here */}
          <div className="aspect-video bg-accent-2 rounded-lg"></div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Details</h2>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm text-gray-400">Status</dt>
              <dd className="font-medium">{generation.status}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-400">Created</dt>
              <dd className="font-medium">{generation.createdDate}</dd>
            </div>
            {generation.completedDate && (
              <div>
                <dt className="text-sm text-gray-400">Completed</dt>
                <dd className="font-medium">{generation.completedDate}</dd>
              </div>
            )}
          </dl>

          <button className="mt-6 w-full px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition">
            Publish Generation
          </button>
        </div>
      </div>
    </div>
  )
}
