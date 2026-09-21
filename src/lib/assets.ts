import type { TaglineVariant } from './layout'
import type { Frame } from '../types'
import type { AssetKind } from './customAssets'

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

export interface ResolvedAsset {
  src: string
  aspectRatio: number
  kind: AssetKind
  svgText?: string
  /** true when it's the user's own uploaded file, not the fixed system asset. */
  isCustom: boolean
}

/** Etiqueta: usa o upload do usuário para este frame, se houver; senão o PNG padrão do sistema. */
export function resolveEtiquetaAsset(frame: Frame): ResolvedAsset {
  if (frame.customEtiqueta) {
    const { src, naturalWidth, naturalHeight, kind, svgText } = frame.customEtiqueta
    return { src, aspectRatio: naturalWidth / naturalHeight, kind, svgText, isCustom: true }
  }
  return { src: ETIQUETA.src, aspectRatio: ETIQUETA.aspectRatio, kind: 'raster', isCustom: false }
}

/** Tagline: usa o upload do usuário para este frame, se houver; senão a variante A/B padrão. */
export function resolveTaglineAsset(frame: Frame, variant: TaglineVariant): ResolvedAsset {
  if (frame.customTagline) {
    const { src, naturalWidth, naturalHeight, kind, svgText } = frame.customTagline
    return { src, aspectRatio: naturalWidth / naturalHeight, kind, svgText, isCustom: true }
  }
  const tagline = TAGLINES[variant]
  return { src: tagline.src, aspectRatio: tagline.aspectRatio, kind: 'svg', isCustom: false }
}
