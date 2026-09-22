/**
 * Export engine (Seção 7).
 *  - PNG: rasterized on an offscreen canvas at 150 DPI.
 *  - PDF: vector — built as an SVG document and converted with svg2pdf.js.
 *    Etiqueta e tagline entram como vetor real (<g> com o markup SVG
 *    inlined) quando o asset (padrão ou enviado pelo usuário) é SVG;
 *    quando é PNG/JPG (padrão ou upload), entram como raster embutido em
 *    alta resolução. A foto é sempre raster, por natureza.
 */
import { jsPDF } from 'jspdf'
import 'svg2pdf.js'
import { computeLayout } from './layout'
import { getEtiquetaRenderRect, type EtiquetaLayer } from './assets'
import { getGuideBoxes, type GuideBox } from './guides'
import { coverScale } from './photo'
import { pxToMm, pxToExportPixels } from './units'
import { assetUrl } from './url'
import { resolveFrameAssets } from './frame'
import type { Frame } from '../types'
import type { Rect } from './layout'

const SVG_NS = 'http://www.w3.org/2000/svg'
const PLACEHOLDER_GRAY = '#9aa5ab'

// Fonte customizada da tagline (variante A). Registrada no jsPDF para que
// svg2pdf.js converta o texto em glifos vetoriais reais, em vez de cair
// numa fonte padrão do PDF.
const HERING_FONT_FILE = 'HeringSans-Bold.ttf'
const HERING_FONT_FAMILY = 'HeringSans-Bold'
let heringFontBase64: Promise<string> | null = null

function loadHeringFontBase64(): Promise<string> {
  if (!heringFontBase64) {
    heringFontBase64 = fetch(assetUrl('assets/fonts/HeringSans-Bold.ttf'))
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const bytes = new Uint8Array(buf)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
        return btoa(binary)
      })
  }
  return heringFontBase64
}

async function registerCustomFonts(pdf: jsPDF) {
  const base64 = await loadHeringFontBase64()
  pdf.addFileToVFS(HERING_FONT_FILE, base64)
  pdf.addFont(HERING_FONT_FILE, HERING_FONT_FAMILY, 'normal', 700)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** Replicates the on-screen object-fit:cover + centered scale/pan for export, which has no native object-fit. */
function photoDisplayRect(frame: Frame, photoArea: Rect) {
  if (!frame.photo) return null
  const base = coverScale(photoArea, frame.photo.naturalWidth, frame.photo.naturalHeight)
  const { scale, panX, panY } = frame.photo.transform
  const width = frame.photo.naturalWidth * base * scale
  const height = frame.photo.naturalHeight * base * scale
  const x = photoArea.x + photoArea.width / 2 + panX - width / 2
  const y = photoArea.y + photoArea.height / 2 + panY - height / 2
  return { x, y, width, height }
}

function frameLayout(frame: Frame) {
  const { etiquetaAsset: etiqueta, taglineAsset: tagline } = resolveFrameAssets(frame)
  const layout = computeLayout(frame.widthPx, frame.heightPx, frame.overrides, etiqueta.aspectRatio, tagline.aspectRatio)
  return { layout, etiqueta, tagline }
}

function filenameFor(frame: Frame, ext: string): string {
  const safe = frame.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()
  return `${safe || 'frame'}.${ext}`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ---------- PNG (150 DPI) ----------

export async function exportFramePNG(frame: Frame): Promise<void> {
  const { layout, etiqueta, tagline } = frameLayout(frame)
  const scale = pxToExportPixels(1)

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(frame.widthPx * scale)
  canvas.height = Math.round(frame.heightPx * scale)
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Photo (or gray placeholder)
  const photoArea = layout.photoArea
  ctx.save()
  ctx.beginPath()
  ctx.rect(photoArea.x * scale, photoArea.y * scale, photoArea.width * scale, photoArea.height * scale)
  ctx.clip()
  if (frame.photo) {
    const img = await loadImage(frame.photo.src)
    const rect = photoDisplayRect(frame, photoArea)!
    ctx.drawImage(img, rect.x * scale, rect.y * scale, rect.width * scale, rect.height * scale)
  } else {
    ctx.fillStyle = PLACEHOLDER_GRAY
    ctx.fillRect(photoArea.x * scale, photoArea.y * scale, photoArea.width * scale, photoArea.height * scale)
  }
  ctx.restore()

  // Etiqueta: sombra (multiply) atrás + frente, no retângulo expandido pelo inset
  const etiquetaRect = getEtiquetaRenderRect(etiqueta, layout.etiqueta)
  if (etiqueta.shadow) {
    const shadowImg = await loadImage(etiqueta.shadow.src)
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(shadowImg, etiquetaRect.x * scale, etiquetaRect.y * scale, etiquetaRect.width * scale, etiquetaRect.height * scale)
    ctx.restore()
  }
  const etiquetaImg = await loadImage(etiqueta.front.src)
  ctx.drawImage(
    etiquetaImg,
    etiquetaRect.x * scale,
    etiquetaRect.y * scale,
    etiquetaRect.width * scale,
    etiquetaRect.height * scale,
  )

  // Tagline (raster ou SVG)
  const taglineImg = await loadImage(tagline.src)
  ctx.drawImage(
    taglineImg,
    layout.tagline.x * scale,
    layout.tagline.y * scale,
    layout.tagline.width * scale,
    layout.tagline.height * scale,
  )

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  )
  downloadBlob(blob, filenameFor(frame, 'png'))
}

// ---------- PDF (vector) ----------

const svgSourceCache: Record<string, Promise<{ inner: string; viewBox: [number, number, number, number] }>> = {}

function parseSvgMarkup(text: string): { inner: string; viewBox: [number, number, number, number] } {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const root = doc.documentElement
  let viewBox = (root.getAttribute('viewBox') ?? '').trim().split(/\s+/).map(Number)
  if (viewBox.length !== 4 || viewBox.some(Number.isNaN)) {
    const w = parseFloat(root.getAttribute('width') ?? '100')
    const h = parseFloat(root.getAttribute('height') ?? '100')
    viewBox = [0, 0, w, h]
  }
  return { inner: root.innerHTML, viewBox: viewBox as [number, number, number, number] }
}

function getSvgSource(layer: EtiquetaLayer) {
  if (layer.svgText) return Promise.resolve(parseSvgMarkup(layer.svgText))
  if (!svgSourceCache[layer.src]) {
    svgSourceCache[layer.src] = fetch(layer.src)
      .then((r) => r.text())
      .then(parseSvgMarkup)
  }
  return svgSourceCache[layer.src]
}

/** Adiciona uma camada (etiqueta ou tagline) ao SVG de exportação, como vetor real quando é SVG, ou <image> raster caso contrário. */
async function appendLayer(svg: SVGSVGElement, layer: EtiquetaLayer, rect: Rect, blendMode?: 'multiply') {
  if (layer.kind === 'svg') {
    const { inner, viewBox } = await getSvgSource(layer)
    const [, , vbWidth, vbHeight] = viewBox
    const group = document.createElementNS(SVG_NS, 'g')
    const scaleX = rect.width / vbWidth
    const scaleY = rect.height / vbHeight
    group.setAttribute('transform', `translate(${rect.x}, ${rect.y}) scale(${scaleX}, ${scaleY})`)
    if (blendMode) group.setAttribute('style', `mix-blend-mode:${blendMode}`)
    group.innerHTML = inner
    svg.appendChild(group)
  } else {
    const image = document.createElementNS(SVG_NS, 'image')
    image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', layer.src)
    image.setAttribute('href', layer.src)
    image.setAttribute('x', String(rect.x))
    image.setAttribute('y', String(rect.y))
    image.setAttribute('width', String(rect.width))
    image.setAttribute('height', String(rect.height))
    if (blendMode) image.setAttribute('style', `mix-blend-mode:${blendMode}`)
    svg.appendChild(image)
  }
}

function createFrameSvg(frame: Frame): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement
  svg.setAttribute('xmlns', SVG_NS)
  svg.setAttribute('width', String(frame.widthPx))
  svg.setAttribute('height', String(frame.heightPx))
  svg.setAttribute('viewBox', `0 0 ${frame.widthPx} ${frame.heightPx}`)

  const bg = document.createElementNS(SVG_NS, 'rect')
  bg.setAttribute('x', '0')
  bg.setAttribute('y', '0')
  bg.setAttribute('width', String(frame.widthPx))
  bg.setAttribute('height', String(frame.heightPx))
  bg.setAttribute('fill', '#ffffff')
  svg.appendChild(bg)
  return svg
}

async function savePdfFromSvg(frame: Frame, svg: SVGSVGElement): Promise<void> {
  const widthMm = pxToMm(frame.widthPx)
  const heightMm = pxToMm(frame.heightPx)
  document.body.appendChild(svg)
  try {
    const pdf = new jsPDF({
      unit: 'mm',
      format: [widthMm, heightMm],
      orientation: widthMm > heightMm ? 'landscape' : 'portrait',
    })
    await registerCustomFonts(pdf)
    await pdf.svg(svg, { x: 0, y: 0, width: widthMm, height: heightMm })
    pdf.save(filenameFor(frame, 'pdf'))
  } finally {
    svg.remove()
  }
}

export async function exportFramePDF(frame: Frame): Promise<void> {
  const { layout, etiqueta, tagline } = frameLayout(frame)
  const svg = createFrameSvg(frame)

  // Photo (clipped) or gray placeholder
  const photoArea = layout.photoArea
  const clipId = 'photo-clip'
  const defs = document.createElementNS(SVG_NS, 'defs')
  const clipPath = document.createElementNS(SVG_NS, 'clipPath')
  clipPath.setAttribute('id', clipId)
  const clipRect = document.createElementNS(SVG_NS, 'rect')
  clipRect.setAttribute('x', String(photoArea.x))
  clipRect.setAttribute('y', String(photoArea.y))
  clipRect.setAttribute('width', String(photoArea.width))
  clipRect.setAttribute('height', String(photoArea.height))
  clipPath.appendChild(clipRect)
  defs.appendChild(clipPath)
  svg.appendChild(defs)

  if (frame.photo) {
    const rect = photoDisplayRect(frame, photoArea)!
    const g = document.createElementNS(SVG_NS, 'g')
    g.setAttribute('clip-path', `url(#${clipId})`)
    const image = document.createElementNS(SVG_NS, 'image')
    image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', frame.photo.src)
    image.setAttribute('href', frame.photo.src)
    image.setAttribute('x', String(rect.x))
    image.setAttribute('y', String(rect.y))
    image.setAttribute('width', String(rect.width))
    image.setAttribute('height', String(rect.height))
    image.setAttribute('preserveAspectRatio', 'none')
    g.appendChild(image)
    svg.appendChild(g)
  } else {
    const placeholder = document.createElementNS(SVG_NS, 'rect')
    placeholder.setAttribute('x', String(photoArea.x))
    placeholder.setAttribute('y', String(photoArea.y))
    placeholder.setAttribute('width', String(photoArea.width))
    placeholder.setAttribute('height', String(photoArea.height))
    placeholder.setAttribute('fill', PLACEHOLDER_GRAY)
    svg.appendChild(placeholder)
  }

  const etiquetaRect = getEtiquetaRenderRect(etiqueta, layout.etiqueta)
  if (etiqueta.shadow) await appendLayer(svg, etiqueta.shadow, etiquetaRect, 'multiply')
  await appendLayer(svg, etiqueta.front, etiquetaRect)
  await appendLayer(svg, tagline, layout.tagline)

  await savePdfFromSvg(frame, svg)
}

// ---------- PDF de guias (caixas vetoriais, sem os assets — para montar no Illustrator) ----------

function appendGuideBox(svg: SVGSVGElement, box: GuideBox, frameWidthPx: number) {
  const isFrame = box.key === 'frame'
  const stroke = isFrame ? '#7a8a92' : '#0067b3'
  // Escala pelo tamanho do FRAME (não da própria caixa), para os rótulos ficarem
  // legíveis e consistentes entre si independente do tamanho de cada zona.
  const baseFontSize = isFrame ? frameWidthPx * 0.01 : frameWidthPx * 0.016
  const fontSize = Math.max(isFrame ? 8 : 10, Math.min(baseFontSize, box.rect.height * 0.4))

  const rect = document.createElementNS(SVG_NS, 'rect')
  rect.setAttribute('x', String(box.rect.x))
  rect.setAttribute('y', String(box.rect.y))
  rect.setAttribute('width', String(box.rect.width))
  rect.setAttribute('height', String(box.rect.height))
  rect.setAttribute('fill', 'none')
  rect.setAttribute('stroke', stroke)
  rect.setAttribute('stroke-width', '1.5')
  svg.appendChild(rect)

  const text = document.createElementNS(SVG_NS, 'text')
  text.setAttribute('x', String(box.rect.x + 8))
  text.setAttribute('y', String(box.rect.y + fontSize + 6))
  text.setAttribute('font-family', 'Helvetica, Arial, sans-serif')
  text.setAttribute('font-size', String(fontSize))
  text.setAttribute('font-weight', 'bold')
  text.setAttribute('fill', stroke)
  text.textContent = box.label
  svg.appendChild(text)
}

/** Exporta apenas as caixas vetoriais (margem, foto, etiqueta, tagline) — sem os assets reais — prontas para montar manualmente no Illustrator. */
export async function exportFrameGuidesPDF(frame: Frame): Promise<void> {
  const { layout } = frameLayout(frame)
  const svg = createFrameSvg(frame)

  for (const box of getGuideBoxes(frame.widthPx, frame.heightPx, layout)) {
    appendGuideBox(svg, box, frame.widthPx)
  }

  await savePdfFromSvg(frame, svg)
}
