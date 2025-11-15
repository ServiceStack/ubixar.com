/**
 * ArtifactGrid Component
 *
 * Masonry grid layout for displaying artifacts
 */

'use client'

import { useState } from 'react'
import { Artifact } from '@/lib/dtos'
import { getAssetUrl } from '@/lib/utils/assets'
import { Modal } from '@/components/ui'

interface ArtifactGridProps {
  artifacts: Artifact[]
  onArtifactClick?: (artifact: Artifact) => void
}

export function ArtifactGrid({ artifacts, onArtifactClick }: ArtifactGridProps) {
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null)
  const [imageError, setImageError] = useState<Set<number>>(new Set())

  const handleArtifactClick = (artifact: Artifact) => {
    if (onArtifactClick) {
      onArtifactClick(artifact)
    } else {
      setSelectedArtifact(artifact)
    }
  }

  const handleImageError = (artifactId: number) => {
    setImageError((prev) => new Set(prev).add(artifactId))
  }

  if (artifacts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No artifacts to display
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {artifacts.map((artifact, index) => {
          if (imageError.has(artifact.id || 0)) return null

          return (
            <div
              key={artifact.id}
              style={{ animationDelay: `${(index % 10) * 30}ms` }}
              className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover-scale transition group relative animate-fade-in"
              onClick={() => handleArtifactClick(artifact)}
            >
              {artifact.filePath ? (
                <img
                  src={getAssetUrl(artifact, 'small')}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(artifact.id || 0)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition flex items-end p-2">
                <div className="text-white text-xs opacity-0 group-hover:opacity-100 transition">
                  {artifact.width && artifact.height && (
                    <span>{artifact.width}x{artifact.height}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Lightbox Modal */}
      {selectedArtifact && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedArtifact(null)}
          size="xl"
        >
          <div className="space-y-4">
            <img
              src={getAssetUrl(selectedArtifact, 'large')}
              alt=""
              className="w-full rounded-lg"
            />
            {selectedArtifact.prompt && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Prompt
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedArtifact.prompt}
                </p>
              </div>
            )}
            <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
              {selectedArtifact.width && selectedArtifact.height && (
                <span>{selectedArtifact.width}x{selectedArtifact.height}</span>
              )}
              {selectedArtifact.contentRating && (
                <span>Rating: {selectedArtifact.contentRating}</span>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
