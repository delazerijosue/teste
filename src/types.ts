import type { FrameOverrides } from './lib/layout'
import type { PhotoTransform } from './lib/photo'
import type { Unit } from './lib/units'
import type { CustomAsset } from './lib/customAssets'

export interface PhotoState {
  src: string
  naturalWidth: number
  naturalHeight: number
  transform: PhotoTransform
}

export interface Frame {
  id: string
  name: string
  widthPx: number
  heightPx: number
  inputWidth: number
  inputHeight: number
  unit: Unit
  canvasX: number
  canvasY: number
  overrides: FrameOverrides
  photo: PhotoState | null
  customEtiqueta: CustomAsset | null
  customTagline: CustomAsset | null
}
