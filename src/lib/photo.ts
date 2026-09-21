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

/**
 * Changes zoom while keeping the point currently at the center of `area`
 * fixed, so the image grows/shrinks evenly in every direction instead of
 * anchoring to its top-left corner (which would visibly push the crop
 * toward the bottom-right as it zooms in).
 */
export function zoomPhoto(
  area: Rect,
  naturalWidth: number,
  naturalHeight: number,
  transform: PhotoTransform,
  newScale: number,
): PhotoTransform {
  const base = coverScale(area, naturalWidth, naturalHeight)
  const oldDispWidth = naturalWidth * base * transform.scale
  const oldDispHeight = naturalHeight * base * transform.scale

  const centerX = area.width / 2
  const centerY = area.height / 2
  const fx = oldDispWidth > 0 ? (centerX - transform.offsetX) / oldDispWidth : 0.5
  const fy = oldDispHeight > 0 ? (centerY - transform.offsetY) / oldDispHeight : 0.5

  const newDispWidth = naturalWidth * base * newScale
  const newDispHeight = naturalHeight * base * newScale

  return clampOffset(area, naturalWidth, naturalHeight, {
    scale: newScale,
    offsetX: centerX - fx * newDispWidth,
    offsetY: centerY - fy * newDispHeight,
  })
}

export const MAX_PHOTO_ZOOM = 3

export interface LoadedPhoto {
  src: string
  naturalWidth: number
  naturalHeight: number
  transform: PhotoTransform
}

/**
 * Re-derives a photo transform for a new photo area, preserving the same
 * relative pan position (0..1 fraction of the available slack on each
 * axis) and zoom level instead of re-clamping the raw pixel offsets —
 * so a resized (or duplicated-then-resized) frame keeps a similar crop
 * instead of snapping to a corner.
 */
export function preservePhotoFraction(
  oldArea: Rect,
  newArea: Rect,
  naturalWidth: number,
  naturalHeight: number,
  transform: PhotoTransform,
): PhotoTransform {
  const oldBase = coverScale(oldArea, naturalWidth, naturalHeight)
  const oldSlackX = oldArea.width - naturalWidth * oldBase * transform.scale
  const oldSlackY = oldArea.height - naturalHeight * oldBase * transform.scale
  const fracX = oldSlackX !== 0 ? transform.offsetX / oldSlackX : 0.5
  const fracY = oldSlackY !== 0 ? transform.offsetY / oldSlackY : 0.5

  const newBase = coverScale(newArea, naturalWidth, naturalHeight)
  const newSlackX = newArea.width - naturalWidth * newBase * transform.scale
  const newSlackY = newArea.height - naturalHeight * newBase * transform.scale

  return clampOffset(newArea, naturalWidth, naturalHeight, {
    scale: transform.scale,
    offsetX: newSlackX * fracX,
    offsetY: newSlackY * fracY,
  })
}

/** Loads an image file and centers it (cover-fit) within `area`. */
export function loadPhotoFile(file: File, area: Rect): Promise<LoadedPhoto> {
  return new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({
        src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        transform: centeredTransform(area, img.naturalWidth, img.naturalHeight, 1),
      })
    }
    img.onerror = reject
    img.src = src
  })
}
