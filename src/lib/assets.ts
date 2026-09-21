import type { TaglineVariant } from './layout'

/**
 * Fixed system assets (Seção 3): etiqueta (PNG) and the two tagline
 * variants (SVG). Natural sizes are known up front since the assets are
 * static files shipped with the app — this is what lets computeLayout()
 * work out the etiqueta's proportional width and detect the "etiqueta
 * larga" exception without loading the image first.
 */
export const ETIQUETA = {
  src: '/assets/etiqueta.png',
  naturalWidth: 900,
  naturalHeight: 600,
  aspectRatio: 900 / 600,
}

export const TAGLINES: Record<TaglineVariant, { src: string; naturalWidth: number; naturalHeight: number; aspectRatio: number }> = {
  a: { src: '/assets/tagline-a.svg', naturalWidth: 600, naturalHeight: 140, aspectRatio: 600 / 140 },
  b: { src: '/assets/tagline-b.svg', naturalWidth: 600, naturalHeight: 120, aspectRatio: 600 / 120 },
}
