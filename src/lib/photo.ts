/**
 * Photo fit/zoom/pan (Seção 6).
 *
 * The photo is fit to its area the same way native CSS `object-fit: cover`
 * works: scaled uniformly so the larger side matches the area exactly, then
 * centered — the overflow on the other axis is cropped by the area's own
 * `overflow: hidden`. This guarantees full coverage at any natural image
 * size without any manual width/height math (see PhotoLayer.tsx).
 *
 * Zoom is a plain scale from the center (`transform-origin: center`), so it
 * always grows evenly in every direction. Pan is a translate applied after
 * that scale, in unscaled area-local pixels, clamped so the image can never
 * reveal a gap on either axis.
 */
import type { Rect } from './layout'

export interface PhotoTransform {
  /** Zoom multiplier over the cover-fit size. 1 = exactly covers the area (minimum allowed). */
  scale: number
  /** Translation from center, in unscaled area-local px, applied after the scale. */
  panX: number
  panY: number
}

export const MAX_PHOTO_ZOOM = 3

export function defaultPhotoTransform(): PhotoTransform {
  return { scale: 1, panX: 0, panY: 0 }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** How far the scaled image can be panned on each axis before a gap would appear. */
function maxPan(area: Rect, scale: number): { x: number; y: number } {
  const s = Math.max(1, scale)
  return { x: ((s - 1) * area.width) / 2, y: ((s - 1) * area.height) / 2 }
}

export function clampPan(area: Rect, transform: PhotoTransform): PhotoTransform {
  const scale = Math.max(1, transform.scale)
  const { x: maxX, y: maxY } = maxPan(area, scale)
  return {
    scale,
    panX: clamp(transform.panX, -maxX, maxX),
    panY: clamp(transform.panY, -maxY, maxY),
  }
}

/** Drags the image by (dx, dy) area-local px, clamped to stay gap-free. */
export function panPhoto(area: Rect, transform: PhotoTransform, dx: number, dy: number): PhotoTransform {
  return clampPan(area, { ...transform, panX: transform.panX + dx, panY: transform.panY + dy })
}

/** Changes zoom in place — the center stays fixed because scaling is anchored there. */
export function zoomPhoto(area: Rect, transform: PhotoTransform, newScale: number): PhotoTransform {
  return clampPan(area, { ...transform, scale: newScale })
}

export interface LoadedPhoto {
  src: string
  naturalWidth: number
  naturalHeight: number
  transform: PhotoTransform
}

export function loadPhotoFile(file: File): Promise<LoadedPhoto> {
  return new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({
        src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        transform: defaultPhotoTransform(),
      })
    }
    img.onerror = reject
    img.src = src
  })
}

/**
 * Re-derives a pan for a new photo area, preserving the same relative
 * position (fraction of the allowed pan range on each axis) instead of the
 * raw pixel offset — so a resized (or duplicated-then-resized) frame keeps
 * a similar crop instead of snapping back to center.
 */
export function preservePhotoFraction(oldArea: Rect, newArea: Rect, transform: PhotoTransform): PhotoTransform {
  const oldMax = maxPan(oldArea, transform.scale)
  const fracX = oldMax.x !== 0 ? transform.panX / oldMax.x : 0
  const fracY = oldMax.y !== 0 ? transform.panY / oldMax.y : 0
  const newMax = maxPan(newArea, transform.scale)
  return clampPan(newArea, {
    scale: transform.scale,
    panX: fracX * newMax.x,
    panY: fracY * newMax.y,
  })
}

/**
 * Cover-fit scale (matches CSS `object-fit: cover`) — used only to replicate
 * the on-screen fit for canvas/SVG export, which has no native object-fit.
 */
export function coverScale(area: Rect, naturalWidth: number, naturalHeight: number): number {
  if (naturalWidth <= 0 || naturalHeight <= 0) return 1
  return Math.max(area.width / naturalWidth, area.height / naturalHeight)
}
