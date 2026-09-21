import { useRef, useCallback, type PointerEvent, type WheelEvent } from 'react'
import { useStore } from '../state/store'
import { FrameView } from './FrameView'
import './Canvas.css'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 4

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function Canvas() {
  const frames = useStore((s) => s.frames)
  const view = useStore((s) => s.canvasView)
  const setCanvasView = useStore((s) => s.setCanvasView)
  const selectFrame = useStore((s) => s.selectFrame)

  const viewportRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ startX: number; startY: number; viewX: number; viewY: number } | null>(null)

  const onWheel = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const rect = viewportRef.current!.getBoundingClientRect()
        const cx = e.clientX - rect.left
        const cy = e.clientY - rect.top
        const zoomFactor = Math.exp(-e.deltaY * 0.0015)
        const newZoom = clamp(view.zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM)
        const worldX = (cx - view.x) / view.zoom
        const worldY = (cy - view.y) / view.zoom
        setCanvasView({ zoom: newZoom, x: cx - worldX * newZoom, y: cy - worldY * newZoom })
      } else {
        setCanvasView({ x: view.x - e.deltaX, y: view.y - e.deltaY })
      }
    },
    [view, setCanvasView],
  )

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return
      dragState.current = { startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y }
      selectFrame(null)
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [view, selectFrame],
  )

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!dragState.current) return
      const dx = e.clientX - dragState.current.startX
      const dy = e.clientY - dragState.current.startY
      setCanvasView({ x: dragState.current.viewX + dx, y: dragState.current.viewY + dy })
    },
    [setCanvasView],
  )

  const onPointerUp = useCallback(() => {
    dragState.current = null
  }, [])

  const zoomBy = (factor: number) => {
    const newZoom = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM)
    setCanvasView({ zoom: newZoom })
  }

  const resetView = () => setCanvasView({ x: 0, y: 0, zoom: 1 })

  const dotSize = Math.max(6, 25 * view.zoom)

  return (
    <div
      className="canvas-viewport"
      ref={viewportRef}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{
        backgroundSize: `${dotSize}px ${dotSize}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
    >
      <div
        className="canvas-world"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
      >
        {frames.map((frame) => (
          <FrameView key={frame.id} frame={frame} />
        ))}
      </div>

      {frames.length === 0 && (
        <div className="canvas-empty-hint">
          Clique em &quot;Novo frame&quot; no painel à esquerda para começar
        </div>
      )}

      <div className="zoom-controls">
        <button className="secondary" onClick={() => zoomBy(0.8)} title="Diminuir zoom">
          −
        </button>
        <button className="secondary" onClick={resetView} title="Redefinir zoom">
          {Math.round(view.zoom * 100)}%
        </button>
        <button className="secondary" onClick={() => zoomBy(1.25)} title="Aumentar zoom">
          +
        </button>
      </div>
    </div>
  )
}
