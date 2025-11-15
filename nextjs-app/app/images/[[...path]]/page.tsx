/**
 * Images Gallery Page
 *
 * Displays artifact grid with filtering by ratings and reactions
 */

'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { ArtifactGrid, Button, ArtifactGridSkeleton } from '@/components'

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
        <ArtifactGridSkeleton count={20} />
      ) : (
        <ArtifactGrid artifacts={filteredArtifacts} />
      )}
    </div>
  )
}
