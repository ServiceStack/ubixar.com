/**
 * Home Page
 *
 * Landing page with featured artifacts carousel
 */

'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'

export default function HomePage() {
  const { featuredArtifacts, loadFeatured } = useStore((state) => ({
    featuredArtifacts: state.featuredArtifacts,
    loadFeatured: state.loadFeatured,
  }))

  useEffect(() => {
    loadFeatured()
  }, [loadFeatured])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">
        Welcome to Ubixar
      </h1>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">
          Featured AI Generations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredArtifacts.length === 0 ? (
            <p className="text-gray-400">Loading featured artifacts...</p>
          ) : (
            featuredArtifacts.map((artifact) => (
              <div key={artifact.id} className="rounded-lg overflow-hidden bg-accent-2">
                <div className="aspect-video bg-gray-800">
                  {/* Artifact preview will go here */}
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-400">
                    {artifact.createdDate}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="text-center">
        <h2 className="text-2xl font-semibold mb-4">
          Get Started with AI Workflows
        </h2>
        <p className="text-gray-400 mb-6">
          Create stunning images and audio with our AI-powered workflows
        </p>
        <a
          href="/generate"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Start Generating
        </a>
      </section>
    </div>
  )
}
