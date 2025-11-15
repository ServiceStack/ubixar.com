/**
 * Asset Management Utilities
 *
 * Helper functions for handling asset URLs, variants, and CDN paths
 */

import { Artifact } from '../dtos'

/**
 * Configuration for asset serving
 * In development, this might point to a CDN or local server
 * In production, it uses the same origin
 */
export function getAssetsBaseUrl(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  // Check for environment variable first
  if (process.env.NEXT_PUBLIC_ASSETS_BASE_URL) {
    return process.env.NEXT_PUBLIC_ASSETS_BASE_URL
  }

  // Use same origin in production
  return window.location.origin
}

/**
 * Combine paths safely
 */
export function combinePaths(...paths: string[]): string {
  return paths
    .map((path, index) => {
      if (index === 0) {
        return path.replace(/\/+$/, '')
      }
      return path.replace(/^\/+/, '').replace(/\/+$/, '')
    })
    .filter(Boolean)
    .join('/')
}

/**
 * Get the right part of a string after a delimiter
 */
export function rightPart(str: string, delimiter: string): string {
  const index = str.lastIndexOf(delimiter)
  return index >= 0 ? str.substring(index) : str
}

/**
 * Get asset variant dimensions based on size
 */
export function getVariantDimensions(size: 'small' | 'medium' | 'large') {
  const dimensions = {
    small: { width: 118, height: 207 },
    medium: { width: 288, height: 504 },
    large: { width: 1024, height: 1024 },
  }

  return dimensions[size]
}

/**
 * Get variant path for an artifact
 */
export function getVariantPath(artifact: Artifact, size: 'small' | 'medium' | 'large'): string {
  const dimensions = getVariantDimensions(size)
  const path = rightPart(artifact.filePath || '', '/artifacts')

  const width = artifact.width || 0
  const height = artifact.height || 0

  // Choose dimension based on aspect ratio
  if (height > width) {
    return `/variants/height=${dimensions.height}${path}`
  }
  if (width > height) {
    return `/variants/width=${dimensions.width}${path}`
  }
  return `/variants/width=${dimensions.width}${path}`
}

/**
 * Get asset URL for an artifact with optional variant size
 */
export function getAssetUrl(artifact: Artifact, size?: 'small' | 'medium' | 'large'): string {
  const baseUrl = getAssetsBaseUrl()

  if (!artifact.filePath) {
    return ''
  }

  if (!size) {
    // Return full-size image
    return combinePaths(baseUrl, artifact.filePath)
  }

  // Return variant
  const variantPath = getVariantPath(artifact, size)
  return combinePaths(baseUrl, variantPath)
}

/**
 * Get poster image URL for a generation
 */
export function getPosterUrl(artifact: Artifact): string {
  return getAssetUrl(artifact, 'medium')
}

/**
 * Get thumbnail URL for a generation
 */
export function getThumbnailUrl(artifact: Artifact): string {
  return getAssetUrl(artifact, 'small')
}
