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
  const selectedFrameId = useStore((s) => s.selectedFrameId)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  return (
    <div className="app-shell">
      <LeftPanel />
      <Canvas />
      {selectedFrameId && <RightPanel frameId={selectedFrameId} />}
    </div>
  )
}
