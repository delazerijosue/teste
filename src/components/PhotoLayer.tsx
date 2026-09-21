import { useCallback, useRef, type ChangeEvent, type MouseEvent, type PointerEvent } from 'react'
import { useStore } from '../state/store'
import { clampOffset, coverScale, centeredTransform, type PhotoTransform } from '../lib/photo'
import type { Rect } from '../lib/layout'
import type { Frame } from '../types'
import './PhotoLayer.css'

const MAX_ZOOM = 3

export function PhotoLayer({ frame, photoArea }: { frame: Frame; photoArea: Rect }) {
  const selectedFrameId = useStore((s) => s.selectedFrameId)
  const setPhoto = useStore((s) => s.setPhoto)
  const updatePhotoTransform = useStore((s) => s.updatePhotoTransform)
  const snapshot = useStore((s) => s.snapshot)
  const canvasZoom = useStore((s) => s.canvasView.zoom)
  const isSelected = selectedFrameId === frame.id

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragState = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null)

  const onFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      if (!/^image\/(png|jpe?g)$/.test(file.type)) return

      const src = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const transform = centeredTransform(photoArea, img.naturalWidth, img.naturalHeight, 1)
        setPhoto(frame.id, {
          src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          transform,
        })
      }
      img.src = src
    },
    [frame.id, photoArea, setPhoto],
  )

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!frame.photo) return
      e.stopPropagation()
      snapshot()
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        offsetX: frame.photo.transform.offsetX,
        offsetY: frame.photo.transform.offsetY,
      }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [frame.photo, snapshot],
  )

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!dragState.current || !frame.photo) return
      const dx = (e.clientX - dragState.current.startX) / canvasZoom
      const dy = (e.clientY - dragState.current.startY) / canvasZoom
      const next: PhotoTransform = {
        scale: frame.photo.transform.scale,
        offsetX: dragState.current.offsetX + dx,
        offsetY: dragState.current.offsetY + dy,
      }
      const clamped = clampOffset(photoArea, frame.photo.naturalWidth, frame.photo.naturalHeight, next)
      updatePhotoTransform(frame.id, clamped)
    },
    [frame.id, frame.photo, photoArea, canvasZoom, updatePhotoTransform],
  )

  const onPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    dragState.current = null
    e.stopPropagation()
  }, [])

  const onZoomChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!frame.photo) return
      const scale = Number(e.target.value)
      const clamped = clampOffset(photoArea, frame.photo.naturalWidth, frame.photo.naturalHeight, {
        ...frame.photo.transform,
        scale,
      })
      updatePhotoTransform(frame.id, clamped)
    },
    [frame.id, frame.photo, photoArea, updatePhotoTransform],
  )

  const openFileDialog = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      fileInputRef.current?.click()
    },
    [],
  )

  const base = frame.photo ? coverScale(photoArea, frame.photo.naturalWidth, frame.photo.naturalHeight) : 1
  const dispWidth = frame.photo ? frame.photo.naturalWidth * base * frame.photo.transform.scale : 0
  const dispHeight = frame.photo ? frame.photo.naturalHeight * base * frame.photo.transform.scale : 0

  return (
    <div
      className="photo-layer"
      style={{ left: photoArea.x, top: photoArea.y, width: photoArea.width, height: photoArea.height }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {frame.photo ? (
        <img
          src={frame.photo.src}
          alt="Foto"
          className="photo-layer__img"
          draggable={false}
          style={{
            left: frame.photo.transform.offsetX,
            top: frame.photo.transform.offsetY,
            width: dispWidth,
            height: dispHeight,
          }}
        />
      ) : (
        <button className="photo-layer__placeholder" onClick={openFileDialog} type="button">
          <span className="photo-layer__plus">+</span>
          <span>Enviar foto</span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="photo-layer__input"
        onChange={onFileChange}
      />

      {isSelected && frame.photo && (
        <div className="photo-layer__controls" onPointerDown={(e) => e.stopPropagation()}>
          <button className="secondary photo-layer__replace" onClick={openFileDialog} type="button">
            Trocar foto
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={frame.photo.transform.scale}
            onPointerDown={() => snapshot()}
            onChange={onZoomChange}
          />
        </div>
      )}
    </div>
  )
}
