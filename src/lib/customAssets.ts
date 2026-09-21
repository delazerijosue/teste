/**
 * Upload de etiqueta/tagline personalizados por frame — substitui os
 * assets fixos do sistema (Seção 3) quando o usuário envia seu próprio
 * arquivo. SVG é mantido como vetor (svgText) para a exportação em PDF;
 * PNG/JPG entram como raster, igual à etiqueta padrão.
 */

export type AssetKind = 'raster' | 'svg'

export interface CustomAsset {
  src: string
  naturalWidth: number
  naturalHeight: number
  kind: AssetKind
  /** Markup interno do SVG (conteúdo de <svg>), só quando kind === 'svg'. */
  svgText?: string
}

const ACCEPTED_TYPES = /^image\/(png|jpe?g|svg\+xml)$/

export function isAcceptedAssetFile(file: File): boolean {
  return ACCEPTED_TYPES.test(file.type) || /\.(png|jpe?g|svg)$/i.test(file.name)
}

function loadRaster(file: File): Promise<CustomAsset> {
  return new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ src, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, kind: 'raster' })
    img.onerror = reject
    img.src = src
  })
}

async function loadSvg(file: File): Promise<CustomAsset> {
  const text = await file.text()
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const root = doc.documentElement
  let width = parseFloat(root.getAttribute('width') ?? '')
  let height = parseFloat(root.getAttribute('height') ?? '')
  if (!width || !height) {
    const viewBox = root.getAttribute('viewBox')
    if (viewBox) {
      const parts = viewBox.trim().split(/\s+/).map(Number)
      if (parts.length === 4) {
        width = parts[2]
        height = parts[3]
      }
    }
  }
  if (!width || !height) {
    width = 600
    height = 300
  }
  const src = URL.createObjectURL(file)
  return { src, naturalWidth: width, naturalHeight: height, kind: 'svg', svgText: text }
}

export function loadCustomAsset(file: File): Promise<CustomAsset> {
  const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)
  return isSvg ? loadSvg(file) : loadRaster(file)
}
