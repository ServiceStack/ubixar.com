/**
 * Images Gallery Page
 *
 * Displays artifact grid with filtering by ratings and reactions
 */

'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { ArtifactGrid, Button } from '@/components'

export default function ImagesPage() {
  const {
    artifacts,
    loadArtifacts,
    selectedRatings,
    setSelectedRatings,
    loading,
  } = useStore((state) => ({
    artifacts: state.artifacts,
    loadArtifacts: state.loadArtifacts,
    selectedRatings: state.selectedRatings,
    setSelectedRatings: state.setSelectedRatings,
    loading: state.loading,
  }))

  useEffect(() => {
    if (artifacts.length === 0 && !loading) {
      loadArtifacts()
    }
  }, [artifacts.length, loading, loadArtifacts])

  const ratings = ['PG', 'PG-13', 'R', 'X']

  const toggleRating = (rating: string) => {
    if (selectedRatings.includes(rating)) {
      setSelectedRatings(selectedRatings.filter((r) => r !== rating))
    } else {
      setSelectedRatings([...selectedRatings, rating])
    }
  }

  const filteredArtifacts = artifacts.filter((artifact) =>
    selectedRatings.includes(artifact.contentRating || 'PG')
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Image Gallery</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {filteredArtifacts.length} images
          </p>
        </div>

        {/* Rating filters */}
        <div className="flex flex-wrap gap-2">
          {ratings.map((rating) => (
            <Button
              key={rating}
              onClick={() => toggleRating(rating)}
              variant={selectedRatings.includes(rating) ? 'primary' : 'secondary'}
              size="sm"
            >
              {rating}
            </Button>
          ))}
        </div>
      </div>

      {loading && artifacts.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <svg className="animate-spin h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-500 dark:text-gray-400">Loading artifacts...</p>
          </div>
        </div>
      ) : (
        <ArtifactGrid artifacts={filteredArtifacts} />
      )}
    </div>
  )
}
