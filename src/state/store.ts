import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { defaultOverrides, type FrameOverrides } from '../lib/layout'
import { toPx, type Unit } from '../lib/units'
import type { Frame, PhotoState } from '../types'

interface CanvasView {
  x: number
  y: number
  zoom: number
}

interface AppState {
  frames: Frame[]
  selectedFrameId: string | null
  debugMode: boolean
  leftPanelCollapsed: boolean
  canvasView: CanvasView

  createFrame: (input: { width: number; height: number; unit: Unit }) => string
  selectFrame: (id: string | null) => void
  removeFrame: (id: string) => void
  moveFrame: (id: string, canvasX: number, canvasY: number) => void
  updateOverrides: (id: string, patch: Partial<FrameOverrides>) => void
  clearOverride: (id: string, key: keyof FrameOverrides) => void
  setPhoto: (id: string, photo: PhotoState | null) => void
  updatePhotoTransform: (id: string, transform: PhotoState['transform']) => void
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

  createFrame: ({ width, height, unit }) => {
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
    }
    set((s) => ({ frames: [...s.frames, frame], selectedFrameId: id }))
    return id
  },

  selectFrame: (id) => set({ selectedFrameId: id }),

  removeFrame: (id) =>
    set((s) => ({
      frames: s.frames.filter((f) => f.id !== id),
      selectedFrameId: s.selectedFrameId === id ? null : s.selectedFrameId,
    })),

  moveFrame: (id, canvasX, canvasY) =>
    set((s) => ({
      frames: s.frames.map((f) => (f.id === id ? { ...f, canvasX, canvasY } : f)),
    })),

  updateOverrides: (id, patch) =>
    set((s) => ({
      frames: s.frames.map((f) =>
        f.id === id ? { ...f, overrides: { ...f.overrides, ...patch } } : f,
      ),
    })),

  clearOverride: (id, key) =>
    set((s) => ({
      frames: s.frames.map((f) => {
        if (f.id !== id) return f
        const overrides = { ...f.overrides }
        delete overrides[key]
        return { ...f, overrides }
      }),
    })),

  setPhoto: (id, photo) =>
    set((s) => ({
      frames: s.frames.map((f) => (f.id === id ? { ...f, photo } : f)),
    })),

  updatePhotoTransform: (id, transform) =>
    set((s) => ({
      frames: s.frames.map((f) =>
        f.id === id && f.photo ? { ...f, photo: { ...f.photo, transform } } : f,
      ),
    })),

  toggleDebug: () => set((s) => ({ debugMode: !s.debugMode })),
  toggleLeftPanel: () => set((s) => ({ leftPanelCollapsed: !s.leftPanelCollapsed })),
  setCanvasView: (view) => set((s) => ({ canvasView: { ...s.canvasView, ...view } })),
}))
