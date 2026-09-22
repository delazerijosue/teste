/**
 * Modo "Guias" — no lugar dos assets reais, cada frame mostra/exporta
 * caixas vetoriais marcando onde cada peça entra (margem, foto, etiqueta,
 * tagline), para montar o layout manualmente no Illustrator. Compartilhado
 * entre a prévia em tela (FrameView) e a exportação em PDF (export.ts) para
 * as duas ficarem sempre idênticas.
 */
import type { LayoutResult, Rect } from './layout'

export interface GuideBox {
  key: string
  label: string
  rect: Rect
}

export function getGuideBoxes(widthPx: number, heightPx: number, layout: LayoutResult): GuideBox[] {
  return [
    { key: 'frame', label: 'MARGEM', rect: { x: 0, y: 0, width: widthPx, height: heightPx } },
    { key: 'photo', label: 'FOTO', rect: layout.photoArea },
    { key: 'etiqueta', label: 'ETIQUETA', rect: layout.etiqueta },
    { key: 'tagline', label: 'TAGLINE', rect: layout.tagline },
  ]
}
