import { formatFrameSize } from './units'
import type { Frame } from '../types'

export function getFrameLabel(frame: Frame): string {
  return `${frame.name} — ${formatFrameSize(frame.widthPx, frame.heightPx, frame.unit)}`
}
