import { useState, type FormEvent } from 'react'
import { useStore } from '../state/store'
import type { Unit } from '../lib/units'
import { getFrameLabel } from '../lib/frame'
import { OverridesEditor } from './OverridesEditor'
import './LeftPanel.css'

export function LeftPanel() {
  const collapsed = useStore((s) => s.leftPanelCollapsed)
  const toggleLeftPanel = useStore((s) => s.toggleLeftPanel)
  const debugMode = useStore((s) => s.debugMode)
  const toggleDebug = useStore((s) => s.toggleDebug)
  const createFrame = useStore((s) => s.createFrame)
  const frames = useStore((s) => s.frames)
  const selectedFrameId = useStore((s) => s.selectedFrameId)
  const selectFrame = useStore((s) => s.selectFrame)
  const removeFrame = useStore((s) => s.removeFrame)
  const duplicateFrame = useStore((s) => s.duplicateFrame)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)

  const [width, setWidth] = useState('1080')
  const [height, setHeight] = useState('1350')
  const [unit, setUnit] = useState<Unit>('px')

  const selectedFrame = frames.find((f) => f.id === selectedFrameId) ?? null

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const w = Number(width)
    const h = Number(height)
    if (!w || !h || w <= 0 || h <= 0) return
    createFrame({ width: w, height: h, unit })
  }

  if (collapsed) {
    return (
      <div className="left-panel left-panel--collapsed">
        <button className="secondary" onClick={toggleLeftPanel} title="Expandir painel">
          »
        </button>
      </div>
    )
  }

  return (
    <div className="left-panel">
      <div className="left-panel__header">
        <h1>Gerador de Artes</h1>
        <button className="secondary" onClick={toggleLeftPanel} title="Recolher painel">
          «
        </button>
      </div>

      <section className="left-panel__section left-panel__history">
        <button className="secondary" onClick={undo} disabled={!canUndo} title="Desfazer (Cmd/Ctrl+Z)">
          ↶ Desfazer
        </button>
        <button className="secondary" onClick={redo} disabled={!canRedo} title="Refazer (Cmd/Ctrl+Shift+Z)">
          ↷ Refazer
        </button>
      </section>

      <section className="left-panel__section">
        <h2>Novo frame</h2>
        <form onSubmit={onSubmit} className="new-frame-form">
          <div className="field-row">
            <div>
              <label>Largura</label>
              <input
                type="number"
                min={1}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </div>
            <div>
              <label>Altura</label>
              <input
                type="number"
                min={1}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label>Unidade</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              <option value="px">px</option>
              <option value="cm">cm</option>
            </select>
          </div>
          <button type="submit">+ Criar frame</button>
        </form>
      </section>

      <section className="left-panel__section">
        <label className="checkbox-row">
          <input type="checkbox" checked={debugMode} onChange={toggleDebug} />
          Modo debug
        </label>
      </section>

      {frames.length > 0 && (
        <section className="left-panel__section left-panel__frames">
          <h2>Frames ({frames.length})</h2>
          <ul className="frame-list">
            {frames.map((f) => (
              <li
                key={f.id}
                className={f.id === selectedFrameId ? 'active' : ''}
                onClick={() => selectFrame(f.id)}
              >
                <span className="frame-list__name">{getFrameLabel(f)}</span>
                <span className="frame-list__actions">
                  <button
                    className="secondary frame-list__icon-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      duplicateFrame(f.id)
                    }}
                    title="Duplicar frame"
                    type="button"
                  >
                    ⧉
                  </button>
                  <button
                    className="secondary frame-list__icon-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFrame(f.id)
                    }}
                    title="Remover frame"
                    type="button"
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {selectedFrame && (
        <section className="left-panel__section left-panel__overrides">
          <h2>Ajustes do frame</h2>
          <OverridesEditor frame={selectedFrame} />
        </section>
      )}
    </div>
  )
}
