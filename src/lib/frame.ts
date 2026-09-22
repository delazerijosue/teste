import { formatFrameSize } from './units'
import { computeEtiquetaWideMode, resolveTaglineVariant, type TaglineVariant } from './layout'
import { resolveEtiquetaAsset, resolveTaglineAsset } from './assets'
import type { Frame } from '../types'

export function getFrameLabel(frame: Frame): string {
  return `${frame.name} — ${formatFrameSize(frame.widthPx, frame.heightPx, frame.unit)}`
}

/** Resolves a frame's etiqueta/tagline assets together, since the tagline's default variant (A/B) depends on whether the etiqueta larga mode is active. */
export function resolveFrameAssets(frame: Frame) {
  const etiquetaAsset = resolveEtiquetaAsset(frame)
  const isWide = computeEtiquetaWideMode(frame.widthPx, frame.heightPx, frame.overrides, etiquetaAsset.aspectRatio)
  const variant: TaglineVariant = resolveTaglineVariant(frame.overrides, isWide)
  const taglineAsset = resolveTaglineAsset(frame, variant)
  return { etiquetaAsset, taglineAsset, variant, isWide }
}
