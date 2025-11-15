/**
 * Images Gallery Page
 *
 * Displays artifact grid with filtering by ratings and reactions
 */

'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'

export default function ImagesPage() {
  const { artifacts, loadArtifacts, selectedRatings } = useStore((state) => ({
    artifacts: state.artifacts,
    loadArtifacts: state.loadArtifacts,
    selectedRatings: state.selectedRatings,
  }))

  useEffect(() => {
    if (artifacts.length === 0) {
      loadArtifacts()
    }
  }, [artifacts.length, loadArtifacts])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Image Gallery</h1>

        {/* Rating filters */}
        <div className="flex gap-2">
          {['PG', 'PG-13', 'R', 'X'].map((rating) => (
            <button
              key={rating}
              className={`px-4 py-2 rounded ${
                selectedRatings.includes(rating)
                  ? 'bg-blue-600'
                  : 'bg-accent-2'
              }`}
            >
              {rating}
            </button>
          ))}
        </div>
      </div>

      {/* Artifact Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {artifacts.length === 0 ? (
          <p className="text-gray-400 col-span-full">Loading artifacts...</p>
        ) : (
          artifacts
            .filter((artifact) => selectedRatings.includes(artifact.contentRating || 'PG'))
            .map((artifact) => (
              <div
                key={artifact.id}
                className="aspect-square bg-accent-2 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition"
              >
                {/* Artifact image will go here */}
                <div className="w-full h-full bg-gray-800"></div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}
