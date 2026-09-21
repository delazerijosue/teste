/**
 * Photo fit/zoom/pan math (Seção 6). The photo always fully covers its
 * reserved area — zoom can never go low enough to reveal the gray
 * placeholder behind it, and panning is clamped for the same reason.
 */
import type { Rect } from './layout'

export interface PhotoTransform {
  /** Multiplier over the "cover" scale. 1 = exactly covers the area (minimum allowed). */
  scale: number
  /** Image top-left corner, in photoArea-local px, at scale = 1x cover. */
  offsetX: number
  offsetY: number
}

export function coverScale(area: Rect, naturalWidth: number, naturalHeight: number): number {
  if (naturalWidth <= 0 || naturalHeight <= 0) return 1
  return Math.max(area.width / naturalWidth, area.height / naturalHeight)
}

export function defaultPhotoTransform(): PhotoTransform {
  return { scale: 1, offsetX: 0, offsetY: 0 }
}

/** Clamps offset so the scaled image never leaves a gap inside `area`. */
export function clampOffset(
  area: Rect,
  naturalWidth: number,
  naturalHeight: number,
  transform: PhotoTransform,
): PhotoTransform {
  const base = coverScale(area, naturalWidth, naturalHeight)
  const scale = Math.max(1, transform.scale)
  const dispWidth = naturalWidth * base * scale
  const dispHeight = naturalHeight * base * scale

  const minX = Math.min(0, area.width - dispWidth)
  const minY = Math.min(0, area.height - dispHeight)

  return {
    scale,
    offsetX: clamp(transform.offsetX, minX, 0),
    offsetY: clamp(transform.offsetY, minY, 0),
  }
}

export function centeredTransform(
  area: Rect,
  naturalWidth: number,
  naturalHeight: number,
  scale = 1,
): PhotoTransform {
  const base = coverScale(area, naturalWidth, naturalHeight)
  const dispWidth = naturalWidth * base * scale
  const dispHeight = naturalHeight * base * scale
  return {
    scale,
    offsetX: (area.width - dispWidth) / 2,
    offsetY: (area.height - dispHeight) / 2,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
