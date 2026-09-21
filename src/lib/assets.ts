import type { TaglineVariant, Rect } from './layout'
import type { Frame } from '../types'
import type { AssetKind } from './customAssets'
import { assetUrl } from './url'

/**
 * Fixed system assets (Seção 3): etiqueta (frente + sombra, PNG) and the
 * two tagline variants (SVG). Natural sizes are known up front since the
 * assets are static files shipped with the app — this is what lets
 * computeLayout() work out the etiqueta's proportional width and detect
 * the "etiqueta larga" exception without loading the image first.
 */

export interface EtiquetaInset {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * A etiqueta padrão tem uma folga de sombra ao redor do conteúdo real
 * (o "selo" HERING). Esse desconto (em px, na resolução nativa do
 * arquivo) é usado só para calcular posição/tamanho — o arquivo é sempre
 * desenhado no tamanho real, ultrapassando a caixa calculada.
 */
export const ETIQUETA_FRONT = {
  src: assetUrl('assets/etiqueta-frente.png'),
  naturalWidth: 754,
  naturalHeight: 848,
}

export const ETIQUETA_SHADOW = {
  src: assetUrl('assets/etiqueta-sombra.png'),
  naturalWidth: 754,
  naturalHeight: 848,
}

export const ETIQUETA_INSET: EtiquetaInset = { top: 70, right: 88, bottom: 85, left: 88 }

const ZERO_INSET: EtiquetaInset = { top: 0, right: 0, bottom: 0, left: 0 }

function contentAspectRatio(naturalWidth: number, naturalHeight: number, inset: EtiquetaInset): number {
  const w = naturalWidth - inset.left - inset.right
  const h = naturalHeight - inset.top - inset.bottom
  return w / h
}

/** How far the rendered image bleeds above its content box, relative to the content box's own height. */
function topBleedRatio(naturalHeight: number, inset: EtiquetaInset): number {
  const contentHeight = naturalHeight - inset.top - inset.bottom
  return contentHeight > 0 ? inset.top / contentHeight : 0
}

export const TAGLINES: Record<TaglineVariant, { src: string; naturalWidth: number; naturalHeight: number; aspectRatio: number }> = {
  // UMA-LINHA: "A gente veste o Brasil. Desde 1880." (texto, fonte Hering Sans)
  a: { src: assetUrl('assets/tagline-a.svg'), naturalWidth: 734.53, naturalHeight: 48.51, aspectRatio: 734.53 / 48.51 },
  // DUAS-LINHAS: mesma frase em vetor (contornos), sem dependência de fonte
  b: { src: assetUrl('assets/tagline-b.svg'), naturalWidth: 402.02, naturalHeight: 83.36, aspectRatio: 402.02 / 83.36 },
}

export interface ResolvedAsset {
  src: string
  aspectRatio: number
  kind: AssetKind
  svgText?: string
  /** true when it's the user's own uploaded file, not the fixed system asset. */
  isCustom: boolean
}

export interface EtiquetaLayer {
  src: string
  kind: AssetKind
  svgText?: string
}

export interface ResolvedEtiqueta {
  front: EtiquetaLayer
  /** null when there's no shadow layer (custom per-frame upload). */
  shadow: EtiquetaLayer | null
  naturalWidth: number
  naturalHeight: number
  /** Px descontados (na resolução nativa) só para o cálculo de posição/tamanho. */
  inset: EtiquetaInset
  /** Aspect ratio já considerando o inset — é o que computeLayout usa. */
  aspectRatio: number
  /** Sangramento do topo (linha de costura/sombra) relativo à altura da caixa de conteúdo. */
  topBleedRatio: number
  isCustom: boolean
}

/**
 * Etiqueta: usa o upload do usuário para este frame, se houver (sem sombra,
 * sem desconto de pixels); senão os arquivos padrão do sistema (frente +
 * sombra em multiply, com o desconto de borda fixo).
 */
export function resolveEtiquetaAsset(frame: Frame): ResolvedEtiqueta {
  if (frame.customEtiqueta) {
    const { src, naturalWidth, naturalHeight, kind, svgText } = frame.customEtiqueta
    return {
      front: { src, kind, svgText },
      shadow: null,
      naturalWidth,
      naturalHeight,
      inset: ZERO_INSET,
      aspectRatio: naturalWidth / naturalHeight,
      topBleedRatio: 0,
      isCustom: true,
    }
  }
  return {
    front: { src: ETIQUETA_FRONT.src, kind: 'raster' },
    shadow: { src: ETIQUETA_SHADOW.src, kind: 'raster' },
    naturalWidth: ETIQUETA_FRONT.naturalWidth,
    naturalHeight: ETIQUETA_FRONT.naturalHeight,
    inset: ETIQUETA_INSET,
    aspectRatio: contentAspectRatio(ETIQUETA_FRONT.naturalWidth, ETIQUETA_FRONT.naturalHeight, ETIQUETA_INSET),
    topBleedRatio: topBleedRatio(ETIQUETA_FRONT.naturalHeight, ETIQUETA_INSET),
    isCustom: false,
  }
}

/**
 * Retângulo real de desenho da etiqueta: o arquivo é escalado/posicionado
 * de forma que sua área de conteúdo (descontado o inset) coincida
 * exatamente com `contentBox` (o retângulo calculado pelas regras de
 * layout) — por isso a imagem renderizada é maior que `contentBox` e
 * "vaza" para fora dela nas bordas.
 */
export function getEtiquetaRenderRect(asset: ResolvedEtiqueta, contentBox: Rect): Rect {
  const contentHeight = asset.naturalHeight - asset.inset.top - asset.inset.bottom
  const scale = contentHeight > 0 ? contentBox.height / contentHeight : 1
  return {
    x: contentBox.x - asset.inset.left * scale,
    y: contentBox.y - asset.inset.top * scale,
    width: asset.naturalWidth * scale,
    height: asset.naturalHeight * scale,
  }
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
