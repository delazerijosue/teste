import { useCallback, useMemo, useRef, type PointerEvent } from 'react'
import { useStore } from '../state/store'
import { computeLayout, resolveTaglineVariant } from '../lib/layout'
import { ETIQUETA, TAGLINES } from '../lib/assets'
import { fromPx } from '../lib/units'
import { PhotoLayer } from './PhotoLayer'
import type { Frame } from '../types'
import './FrameView.css'

export function FrameView({ frame }: { frame: Frame }) {
  const selectedFrameId = useStore((s) => s.selectedFrameId)
  const debugMode = useStore((s) => s.debugMode)
  const selectFrame = useStore((s) => s.selectFrame)
  const moveFrame = useStore((s) => s.moveFrame)
  const zoom = useStore((s) => s.canvasView.zoom)

  const isSelected = selectedFrameId === frame.id
  const variant = resolveTaglineVariant(frame.overrides)
  const tagline = TAGLINES[variant]

  const layout = useMemo(
    () => computeLayout(frame.widthPx, frame.heightPx, frame.overrides, ETIQUETA.aspectRatio, tagline.aspectRatio),
    [frame.widthPx, frame.heightPx, frame.overrides, tagline.aspectRatio],
  )

  const dragState = useRef<{ startX: number; startY: number; frameX: number; frameY: number } | null>(null)

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return
      selectFrame(frame.id)
      dragState.current = { startX: e.clientX, startY: e.clientY, frameX: frame.canvasX, frameY: frame.canvasY }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [frame.id, frame.canvasX, frame.canvasY, selectFrame],
  )

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!dragState.current) return
      const dx = (e.clientX - dragState.current.startX) / zoom
      const dy = (e.clientY - dragState.current.startY) / zoom
      moveFrame(frame.id, dragState.current.frameX + dx, dragState.current.frameY + dy)
    },
    [frame.id, zoom, moveFrame],
  )

  const onPointerUp = useCallback(() => {
    dragState.current = null
  }, [])

  const onClickSelect = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      selectFrame(frame.id)
    },
    [frame.id, selectFrame],
  )

  return (
    <div
      className={`frame ${isSelected ? 'frame--selected' : ''}`}
      style={{ left: frame.canvasX, top: frame.canvasY, width: frame.widthPx, height: frame.heightPx }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onClick={onClickSelect}
    >
      <PhotoLayer frame={frame} photoArea={layout.photoArea} />

      <img
        src={ETIQUETA.src}
        alt="Etiqueta"
        className="frame__etiqueta"
        draggable={false}
        style={{
          left: layout.etiqueta.x,
          top: layout.etiqueta.y,
          width: layout.etiqueta.width,
          height: layout.etiqueta.height,
        }}
      />

      <img
        src={tagline.src}
        alt="Tagline"
        className="frame__tagline"
        draggable={false}
        style={{
          left: layout.tagline.x,
          top: layout.tagline.y,
          width: layout.tagline.width,
          height: layout.tagline.height,
        }}
      />

      {debugMode && isSelected && <DebugOverlay frame={frame} layout={layout} />}

      <div className="frame__label">{frame.name}</div>
    </div>
  )
}

function DebugOverlay({ frame, layout }: { frame: Frame; layout: ReturnType<typeof computeLayout> }) {
  const unit = frame.unit
  const fmt = (px: number) => fromPx(px, unit).toFixed(unit === 'cm' ? 2 : 0)

  return (
    <div className="debug-overlay">
      <div className="debug-rect debug-rect--margin" style={{ left: layout.margin.left, top: layout.margin.top, width: frame.widthPx - layout.margin.left - layout.margin.right, height: frame.heightPx - layout.margin.top - layout.margin.bottom }} />
      <div className="debug-rect debug-rect--etiqueta" style={{ left: layout.etiqueta.x, top: layout.etiqueta.y, width: layout.etiqueta.width, height: layout.etiqueta.height }} />
      <div className="debug-rect debug-rect--tagline" style={{ left: layout.tagline.x, top: layout.tagline.y, width: layout.tagline.width, height: layout.tagline.height }} />
      <div className="debug-info">
        <div>tamanho: {fmt(frame.widthPx)} × {fmt(frame.heightPx)} {unit}</div>
        <div>posição: {fmt(frame.canvasX)}, {fmt(frame.canvasY)}</div>
        <div>orientação: {layout.orientation}</div>
        <div>margens: T{fmt(layout.margin.top)} R{fmt(layout.margin.right)} B{fmt(layout.margin.bottom)} L{fmt(layout.margin.left)}</div>
        <div>etiqueta: {fmt(layout.etiqueta.width)}×{fmt(layout.etiqueta.height)} @ {fmt(layout.etiqueta.x)},{fmt(layout.etiqueta.y)} {layout.etiqueta.wideMode ? '(modo largo)' : ''}</div>
        <div>tagline: {fmt(layout.tagline.width)}×{fmt(layout.tagline.height)} @ {fmt(layout.tagline.x)},{fmt(layout.tagline.y)}</div>
      </div>
    </div>
  )
}
