import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { computeLayout, defaultOverrides, resolveTaglineVariant, type FrameOverrides } from '../lib/layout'
import { resolveEtiquetaAsset, resolveTaglineAsset } from '../lib/assets'
import { preservePhotoFraction } from '../lib/photo'
import { toPx, type Unit } from '../lib/units'
import type { CustomAsset } from '../lib/customAssets'
import type { Frame, PhotoState } from '../types'

interface CanvasView {
  x: number
  y: number
  zoom: number
}

interface HistoryEntry {
  frames: Frame[]
  selectedFrameId: string | null
}

const MAX_HISTORY = 50

interface AppState {
  frames: Frame[]
  selectedFrameId: string | null
  debugMode: boolean
  leftPanelCollapsed: boolean
  canvasView: CanvasView
  past: HistoryEntry[]
  future: HistoryEntry[]

  /** Salva o estado atual no histórico de undo. Chame antes de uma mudança que deva ser desfazível. */
  snapshot: () => void
  undo: () => void
  redo: () => void

  createFrame: (input: { width: number; height: number; unit: Unit }) => string
  duplicateFrame: (id: string) => string | null
  selectFrame: (id: string | null) => void
  removeFrame: (id: string) => void
  moveFrame: (id: string, canvasX: number, canvasY: number) => void
  resizeFrame: (id: string, width: number, height: number) => void
  updateOverrides: (id: string, patch: Partial<FrameOverrides>) => void
  clearOverride: (id: string, key: keyof FrameOverrides) => void
  setPhoto: (id: string, photo: PhotoState | null) => void
  updatePhotoTransform: (id: string, transform: PhotoState['transform']) => void
  setCustomEtiqueta: (id: string, asset: CustomAsset | null) => void
  setCustomTagline: (id: string, asset: CustomAsset | null) => void
  toggleDebug: () => void
  toggleLeftPanel: () => void
  setCanvasView: (view: Partial<CanvasView>) => void
}

const NEW_FRAME_GAP = 80

function nextFramePosition(frames: Frame[]): { x: number; y: number } {
  if (frames.length === 0) return { x: 0, y: 0 }
  const last = frames[frames.length - 1]
  return { x: last.canvasX + last.widthPx + NEW_FRAME_GAP, y: last.canvasY }
}

export const useStore = create<AppState>((set, get) => ({
  frames: [],
  selectedFrameId: null,
  debugMode: false,
  leftPanelCollapsed: false,
  canvasView: { x: 0, y: 0, zoom: 1 },
  past: [],
  future: [],

  snapshot: () => {
    const { frames, selectedFrameId, past } = get()
    const entry: HistoryEntry = { frames, selectedFrameId }
    const nextPast = [...past, entry].slice(-MAX_HISTORY)
    set({ past: nextPast, future: [] })
  },

  undo: () => {
    const { past, future, frames, selectedFrameId } = get()
    if (past.length === 0) return
    const previous = past[past.length - 1]
    const current: HistoryEntry = { frames, selectedFrameId }
    set({
      frames: previous.frames,
      selectedFrameId: previous.selectedFrameId,
      past: past.slice(0, -1),
      future: [...future, current],
    })
  },

  redo: () => {
    const { past, future, frames, selectedFrameId } = get()
    if (future.length === 0) return
    const next = future[future.length - 1]
    const current: HistoryEntry = { frames, selectedFrameId }
    set({
      frames: next.frames,
      selectedFrameId: next.selectedFrameId,
      past: [...past, current],
      future: future.slice(0, -1),
    })
  },

  createFrame: ({ width, height, unit }) => {
    get().snapshot()
    const widthPx = toPx(width, unit)
    const heightPx = toPx(height, unit)
    const { x, y } = nextFramePosition(get().frames)
    const id = nanoid()
    const frame: Frame = {
      id,
      name: `Frame ${get().frames.length + 1}`,
      widthPx,
      heightPx,
      inputWidth: width,
      inputHeight: height,
      unit,
      canvasX: x,
      canvasY: y,
      overrides: defaultOverrides(),
      photo: null,
      customEtiqueta: null,
      customTagline: null,
    }
    set((s) => ({ frames: [...s.frames, frame], selectedFrameId: id }))
    return id
  },

  duplicateFrame: (id) => {
    get().snapshot()
    const source = get().frames.find((f) => f.id === id)
    if (!source) return null
    const newId = nanoid()
    const clone: Frame = {
      ...source,
      id: newId,
      name: `${source.name} cópia`,
      canvasX: source.canvasX + 48,
      canvasY: source.canvasY + 48,
      overrides: { ...source.overrides, etiquetaPos: source.overrides.etiquetaPos ? { ...source.overrides.etiquetaPos } : undefined },
      photo: source.photo ? { ...source.photo, transform: { ...source.photo.transform } } : null,
      customEtiqueta: source.customEtiqueta ? { ...source.customEtiqueta } : null,
      customTagline: source.customTagline ? { ...source.customTagline } : null,
    }
    set((s) => ({ frames: [...s.frames, clone], selectedFrameId: newId }))
    return newId
  },

  selectFrame: (id) => set({ selectedFrameId: id }),

  removeFrame: (id) => {
    get().snapshot()
    set((s) => ({
      frames: s.frames.filter((f) => f.id !== id),
      selectedFrameId: s.selectedFrameId === id ? null : s.selectedFrameId,
    }))
  },

  moveFrame: (id, canvasX, canvasY) =>
    set((s) => ({
      frames: s.frames.map((f) => (f.id === id ? { ...f, canvasX, canvasY } : f)),
    })),

  resizeFrame: (id, width, height) => {
    get().snapshot()
    set((s) => ({
      frames: s.frames.map((f) => {
        if (f.id !== id || width <= 0 || height <= 0) return f
        const widthPx = toPx(width, f.unit)
        const heightPx = toPx(height, f.unit)
        const resized: Frame = { ...f, widthPx, heightPx, inputWidth: width, inputHeight: height }

        if (!resized.photo) return resized

        const variant = resolveTaglineVariant(f.overrides)
        const etiqueta = resolveEtiquetaAsset(f)
        const tagline = resolveTaglineAsset(f, variant)
        const oldPhotoArea = computeLayout(f.widthPx, f.heightPx, f.overrides, etiqueta.aspectRatio, tagline.aspectRatio).photoArea
        const newPhotoArea = computeLayout(widthPx, heightPx, resized.overrides, etiqueta.aspectRatio, tagline.aspectRatio).photoArea
        const transform = preservePhotoFraction(
          oldPhotoArea,
          newPhotoArea,
          resized.photo.naturalWidth,
          resized.photo.naturalHeight,
          resized.photo.transform,
        )
        return { ...resized, photo: { ...resized.photo, transform } }
      }),
    }))
  },

  updateOverrides: (id, patch) => {
    get().snapshot()
    set((s) => ({
      frames: s.frames.map((f) =>
        f.id === id ? { ...f, overrides: { ...f.overrides, ...patch } } : f,
      ),
    }))
  },

  clearOverride: (id, key) => {
    get().snapshot()
    set((s) => ({
      frames: s.frames.map((f) => {
        if (f.id !== id) return f
        const overrides = { ...f.overrides }
        delete overrides[key]
        return { ...f, overrides }
      }),
    }))
  },

  setPhoto: (id, photo) => {
    get().snapshot()
    set((s) => ({
      frames: s.frames.map((f) => (f.id === id ? { ...f, photo } : f)),
    }))
  },

  updatePhotoTransform: (id, transform) =>
    set((s) => ({
      frames: s.frames.map((f) =>
        f.id === id && f.photo ? { ...f, photo: { ...f.photo, transform } } : f,
      ),
    })),

  setCustomEtiqueta: (id, asset) => {
    get().snapshot()
    set((s) => ({
      frames: s.frames.map((f) => (f.id === id ? { ...f, customEtiqueta: asset } : f)),
    }))
  },

  setCustomTagline: (id, asset) => {
    get().snapshot()
    set((s) => ({
      frames: s.frames.map((f) => (f.id === id ? { ...f, customTagline: asset } : f)),
    }))
  },

  toggleDebug: () => set((s) => ({ debugMode: !s.debugMode })),
  toggleLeftPanel: () => set((s) => ({ leftPanelCollapsed: !s.leftPanelCollapsed })),
  setCanvasView: (view) => set((s) => ({ canvasView: { ...s.canvasView, ...view } })),
}))
