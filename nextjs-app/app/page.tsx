/**
 * Home Page
 *
 * Landing page with featured artifacts carousel
 */

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { ArtifactGrid, Button } from '@/components'

export default function HomePage() {
  const { featuredArtifacts, loadFeatured, loading } = useStore((state) => ({
    featuredArtifacts: state.featuredArtifacts,
    loadFeatured: state.loadFeatured,
    loading: state.loading,
  }))

  useEffect(() => {
    if (featuredArtifacts.length === 0 && !loading) {
      loadFeatured()
    }
  }, [featuredArtifacts.length, loading, loadFeatured])

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-blue-900 to-gray-900 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            AI-Powered Creative Workflows
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Generate stunning images and audio with cutting-edge AI workflows.
            Transform your ideas into reality with just a few clicks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/generate">
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                Start Creating
              </Button>
            </Link>
            <Link href="/images">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border-white/20">
                Explore Gallery
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Artifacts Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Featured Creations</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Discover amazing AI-generated art from our community
            </p>
          </div>
          <Link href="/images">
            <Button variant="secondary" size="sm">
              View All
            </Button>
          </Link>
        </div>

        {loading && featuredArtifacts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <svg className="animate-spin h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-500 dark:text-gray-400">Loading featured artifacts...</p>
            </div>
          </div>
        ) : featuredArtifacts.length > 0 ? (
          <ArtifactGrid artifacts={featuredArtifacts.slice(0, 10)} />
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>No featured artifacts available yet.</p>
            <p className="mt-2">Be the first to create something amazing!</p>
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 dark:bg-gray-800/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Powerful AI Workflows
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Image Generation</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Create stunning images from text descriptions using state-of-the-art AI models
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Audio Creation</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Generate music and sound effects with advanced AI audio synthesis
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Fast Processing</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Quick turnaround times with our distributed GPU processing infrastructure
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
