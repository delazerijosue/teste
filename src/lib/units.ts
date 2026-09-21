export type Unit = 'px' | 'cm'

/** Internal reference: all frame dimensions are stored in px at a 96 DPI design reference. */
export const REFERENCE_DPI = 96
export const EXPORT_PNG_DPI = 150

const CM_TO_PX = REFERENCE_DPI / 2.54

export function toPx(value: number, unit: Unit): number {
  return unit === 'cm' ? value * CM_TO_PX : value
}

export function fromPx(px: number, unit: Unit): number {
  return unit === 'cm' ? px / CM_TO_PX : px
}

export function pxToMm(px: number): number {
  return (px / REFERENCE_DPI) * 25.4
}

export function pxToExportPixels(px: number): number {
  return (px / REFERENCE_DPI) * EXPORT_PNG_DPI
}

export function formatMeasurement(px: number, unit: Unit): string {
  const value = fromPx(px, unit)
  return `${value.toFixed(unit === 'cm' ? 2 : 0)} ${unit}`
}

export function formatFrameSize(widthPx: number, heightPx: number, unit: Unit): string {
  const decimals = unit === 'cm' ? 2 : 0
  const w = fromPx(widthPx, unit).toFixed(decimals)
  const h = fromPx(heightPx, unit).toFixed(decimals)
  return `${w}×${h} ${unit}`
}
