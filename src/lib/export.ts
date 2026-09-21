/**
 * Export engine (Seção 7).
 *  - PNG: rasterized on an offscreen canvas at 150 DPI.
 *  - PDF: vector — built as an SVG document and converted with svg2pdf.js,
 *    so the tagline (SVG) keeps real vector paths. The etiqueta (PNG) and
 *    the photo are raster, embedded at full asset resolution, since both
 *    are raster sources by nature.
 */
import { jsPDF } from 'jspdf'
import 'svg2pdf.js'
import { computeLayout, resolveTaglineVariant } from './layout'
import { ETIQUETA, TAGLINES } from './assets'
import { coverScale } from './photo'
import { pxToMm, pxToExportPixels } from './units'
import type { Frame } from '../types'

const SVG_NS = 'http://www.w3.org/2000/svg'
const PLACEHOLDER_GRAY = '#9aa5ab'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function photoDisplayRect(frame: Frame, photoArea: ReturnType<typeof computeLayout>['photoArea']) {
  if (!frame.photo) return null
  const base = coverScale(photoArea, frame.photo.naturalWidth, frame.photo.naturalHeight)
  const width = frame.photo.naturalWidth * base * frame.photo.transform.scale
  const height = frame.photo.naturalHeight * base * frame.photo.transform.scale
  const x = photoArea.x + frame.photo.transform.offsetX
  const y = photoArea.y + frame.photo.transform.offsetY
  return { x, y, width, height }
}

function frameLayout(frame: Frame) {
  const variant = resolveTaglineVariant(frame.overrides)
  const tagline = TAGLINES[variant]
  const layout = computeLayout(frame.widthPx, frame.heightPx, frame.overrides, ETIQUETA.aspectRatio, tagline.aspectRatio)
  return { layout, tagline }
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
  const { layout, tagline } = frameLayout(frame)
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

  // Etiqueta
  const etiquetaImg = await loadImage(ETIQUETA.src)
  ctx.drawImage(
    etiquetaImg,
    layout.etiqueta.x * scale,
    layout.etiqueta.y * scale,
    layout.etiqueta.width * scale,
    layout.etiqueta.height * scale,
  )

  // Tagline (rasterize the SVG)
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

let taglineSourceCache: Record<string, Promise<{ inner: string; viewBox: [number, number, number, number] }>> = {}

function fetchTaglineSource(src: string) {
  if (!taglineSourceCache[src]) {
    taglineSourceCache[src] = fetch(src)
      .then((r) => r.text())
      .then((text) => {
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
        const root = doc.documentElement
        const vb = (root.getAttribute('viewBox') ?? '0 0 100 100').split(/\s+/).map(Number) as [
          number,
          number,
          number,
          number,
        ]
        return { inner: root.innerHTML, viewBox: vb }
      })
  }
  return taglineSourceCache[src]
}

export async function exportFramePDF(frame: Frame): Promise<void> {
  const { layout, tagline } = frameLayout(frame)
  const widthMm = pxToMm(frame.widthPx)
  const heightMm = pxToMm(frame.heightPx)

  const svg = document.createElementNS(SVG_NS, 'svg')
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

  // Etiqueta (raster PNG, embedded at native resolution)
  const etiquetaImage = document.createElementNS(SVG_NS, 'image')
  etiquetaImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', ETIQUETA.src)
  etiquetaImage.setAttribute('href', ETIQUETA.src)
  etiquetaImage.setAttribute('x', String(layout.etiqueta.x))
  etiquetaImage.setAttribute('y', String(layout.etiqueta.y))
  etiquetaImage.setAttribute('width', String(layout.etiqueta.width))
  etiquetaImage.setAttribute('height', String(layout.etiqueta.height))
  svg.appendChild(etiquetaImage)

  // Tagline (inlined as vector paths)
  const { inner, viewBox } = await fetchTaglineSource(tagline.src)
  const taglineGroup = document.createElementNS(SVG_NS, 'g')
  const [, , vbWidth, vbHeight] = viewBox
  const scaleX = layout.tagline.width / vbWidth
  const scaleY = layout.tagline.height / vbHeight
  taglineGroup.setAttribute(
    'transform',
    `translate(${layout.tagline.x}, ${layout.tagline.y}) scale(${scaleX}, ${scaleY})`,
  )
  taglineGroup.innerHTML = inner
  svg.appendChild(taglineGroup)

  document.body.appendChild(svg)
  try {
    const pdf = new jsPDF({
      unit: 'mm',
      format: [widthMm, heightMm],
      orientation: widthMm > heightMm ? 'landscape' : 'portrait',
    })
    await pdf.svg(svg, { x: 0, y: 0, width: widthMm, height: heightMm })
    pdf.save(filenameFor(frame, 'pdf'))
  } finally {
    svg.remove()
  }
}
