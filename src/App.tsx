import { useEffect } from 'react'
import { useStore } from './state/store'
import { LeftPanel } from './components/LeftPanel'
import { Canvas } from './components/Canvas'
import { RightPanel } from './components/RightPanel'
import './App.css'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

export default function App() {
  const selectedFrameIds = useStore((s) => s.selectedFrameIds)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const removeFrames = useStore((s) => s.removeFrames)
  const copySelection = useStore((s) => s.copySelection)
  const pasteClipboard = useStore((s) => s.pasteClipboard)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return
      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'c') {
        if (selectedFrameIds.length === 0) return
        e.preventDefault()
        copySelection()
        return
      }
      if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        pasteClipboard()
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedFrameIds.length === 0) return
        e.preventDefault()
        removeFrames(selectedFrameIds)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedFrameIds, undo, redo, copySelection, pasteClipboard, removeFrames])

  return (
    <div className="app-shell">
      <LeftPanel />
      <Canvas />
      {selectedFrameIds.length === 1 && <RightPanel frameId={selectedFrameIds[0]} />}
    </div>
  )
}
