/**
 * Layout engine — implements the fixed generation rules from the spec
 * (Seção 4 — Frame Vertical, Seção 5 — Frame Horizontal, Seção 6 — Foto).
 *
 * All inputs/outputs are in px (96 DPI design reference, see lib/units.ts).
 * Pure functions only — no DOM/React here, so the rules are easy to test
 * and reason about independently of rendering.
 */

export type Orientation = 'vertical' | 'horizontal'
export type TaglineVariant = 'a' | 'b'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Manual overrides a user can set per-frame (Seção 2 — "Edição dos valores padrão").
 * Anything left undefined falls back to the computed default from the rules below.
 */
export interface FrameOverrides {
  marginTopSides?: number
  marginBottom?: number
  etiquetaHeight?: number
  etiquetaPos?: { x: number; y: number }
  taglineWidth?: number
  taglineVariant?: TaglineVariant
}

export function defaultOverrides(): FrameOverrides {
  return { taglineVariant: 'a' }
}

export function resolveTaglineVariant(overrides: FrameOverrides): TaglineVariant {
  return overrides.taglineVariant ?? 'a'
}

export interface LayoutResult {
  orientation: Orientation
  margin: { top: number; right: number; bottom: number; left: number }
  photoArea: Rect
  etiqueta: Rect & { wideMode: boolean }
  tagline: Rect
}

const ETIQUETA_DEFAULT_HEIGHT_RATIO = 0.2 // 20% da altura do frame
const ETIQUETA_GAP_RATIO = 0.07 // 7% da largura do frame
const MARGIN_TOPSIDES_RATIO = 0.02 // 2% do maior lado
const MARGIN_BOTTOM_RATIO = 1 / 7
const MARGIN_BOTTOM_WIDE_RATIO = 2 / 7
const ETIQUETA_WIDE_THRESHOLD_RATIO = 1 / 3
const TAGLINE_WIDTH_RATIO_VERTICAL = 4 / 6
const TAGLINE_WIDTH_RATIO_HORIZONTAL = 1 / 3

export function getOrientation(widthPx: number, heightPx: number): Orientation {
  return heightPx > widthPx ? 'vertical' : 'horizontal'
}

/**
 * @param etiquetaAspectRatio width / height of the etiqueta asset's content box (after inset)
 * @param taglineAspectRatio width / height of the currently selected tagline SVG variant
 * @param etiquetaTopBleedRatio how far (relative to the etiqueta's content-box height) the
 *   rendered etiqueta image extends above its content box — e.g. a shadow/stitching bleed.
 *   0 for assets with no inset (custom uploads). Used so the default position lands the
 *   image's real top edge, not the content box, flush against the margin/photo divider.
 */
export function computeLayout(
  widthPx: number,
  heightPx: number,
  overrides: FrameOverrides,
  etiquetaAspectRatio: number,
  taglineAspectRatio: number,
  etiquetaTopBleedRatio = 0,
): LayoutResult {
  const orientation = getOrientation(widthPx, heightPx)
  const maiorLado = Math.max(widthPx, heightPx)

  const marginTopSides = overrides.marginTopSides ?? MARGIN_TOPSIDES_RATIO * maiorLado

  const etiquetaHeight = overrides.etiquetaHeight ?? ETIQUETA_DEFAULT_HEIGHT_RATIO * heightPx
  const etiquetaWidth = etiquetaHeight * etiquetaAspectRatio

  // Exceção — etiqueta larga: só se aplica ao frame vertical (Seção 4/5).
  const isWide = orientation === 'vertical' && etiquetaWidth > widthPx * ETIQUETA_WIDE_THRESHOLD_RATIO

  const marginBottom =
    overrides.marginBottom ?? (isWide ? MARGIN_BOTTOM_WIDE_RATIO : MARGIN_BOTTOM_RATIO) * heightPx

  const margin = { top: marginTopSides, right: marginTopSides, bottom: marginBottom, left: marginTopSides }

  const photoArea: Rect = {
    x: margin.left,
    y: margin.top,
    width: Math.max(0, widthPx - margin.left - margin.right),
    height: Math.max(0, heightPx - margin.top - marginBottom),
  }

  const gap = ETIQUETA_GAP_RATIO * widthPx
  const bandTop = heightPx - marginBottom

  let etiquetaRect: Rect
  if (isWide) {
    // Etiqueta move para a parte inferior, centralizada horizontalmente,
    // ocupando a parte superior da margem inferior (agora 2/7 da altura).
    const defaultY = bandTop + marginBottom * 0.12
    const defaultX = (widthPx - etiquetaWidth) / 2
    etiquetaRect = {
      x: overrides.etiquetaPos?.x ?? defaultX,
      y: overrides.etiquetaPos?.y ?? defaultY,
      width: etiquetaWidth,
      height: etiquetaHeight,
    }
  } else {
    // A posição Y padrão encosta o topo real da imagem (não a caixa de
    // conteúdo) na divisa entre a margem e o espaço da foto — por isso soma
    // o "sangramento" (linha de costura/sombra) em vez do gap de 7%.
    const defaultY = margin.top + etiquetaHeight * etiquetaTopBleedRatio
    etiquetaRect = {
      x: overrides.etiquetaPos?.x ?? margin.left + gap,
      y: overrides.etiquetaPos?.y ?? defaultY,
      width: etiquetaWidth,
      height: etiquetaHeight,
    }
  }

  const taglineWidthRatio =
    orientation === 'vertical' ? TAGLINE_WIDTH_RATIO_VERTICAL : TAGLINE_WIDTH_RATIO_HORIZONTAL
  const taglineWidth = overrides.taglineWidth ?? taglineWidthRatio * widthPx
  const taglineHeight = taglineWidth / taglineAspectRatio

  let taglineX: number
  let taglineY: number
  if (isWide) {
    // Tagline ocupa o restante da margem inferior, abaixo da etiqueta.
    const remainingTop = etiquetaRect.y + etiquetaRect.height
    const remainingHeight = heightPx - remainingTop
    taglineX = (widthPx - taglineWidth) / 2
    taglineY = remainingTop + (remainingHeight - taglineHeight) / 2
  } else {
    taglineX = (widthPx - taglineWidth) / 2
    taglineY = bandTop + (marginBottom - taglineHeight) / 2
  }

  return {
    orientation,
    margin,
    photoArea,
    etiqueta: { ...etiquetaRect, wideMode: isWide },
    tagline: { x: taglineX, y: taglineY, width: taglineWidth, height: taglineHeight },
  }
}
