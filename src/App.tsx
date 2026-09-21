import { useStore } from './state/store'
import { LeftPanel } from './components/LeftPanel'
import { Canvas } from './components/Canvas'
import { RightPanel } from './components/RightPanel'
import './App.css'

export default function App() {
  const selectedFrameId = useStore((s) => s.selectedFrameId)

  return (
    <div className="app-shell">
      <LeftPanel />
      <Canvas />
      {selectedFrameId && <RightPanel frameId={selectedFrameId} />}
    </div>
  )
}
