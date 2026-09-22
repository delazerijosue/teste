import { useState, type FormEvent, type MouseEvent } from 'react'
import { useStore } from '../state/store'
import type { Unit } from '../lib/units'
import { getFrameLabel } from '../lib/frame'
import { exportFramePDF, exportFramePNG } from '../lib/export'
import { OverridesEditor } from './OverridesEditor'
import './LeftPanel.css'

export function LeftPanel() {
  const collapsed = useStore((s) => s.leftPanelCollapsed)
  const toggleLeftPanel = useStore((s) => s.toggleLeftPanel)
  const debugMode = useStore((s) => s.debugMode)
  const toggleDebug = useStore((s) => s.toggleDebug)
  const createFrame = useStore((s) => s.createFrame)
  const frames = useStore((s) => s.frames)
  const selectedFrameIds = useStore((s) => s.selectedFrameIds)
  const selectFrame = useStore((s) => s.selectFrame)
  const toggleFrameSelection = useStore((s) => s.toggleFrameSelection)
  const removeFrame = useStore((s) => s.removeFrame)
  const removeFrames = useStore((s) => s.removeFrames)
  const duplicateFrame = useStore((s) => s.duplicateFrame)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)

  const [width, setWidth] = useState('1080')
  const [height, setHeight] = useState('1350')
  const [unit, setUnit] = useState<Unit>('px')
  const [bulkBusy, setBulkBusy] = useState<'pdf' | 'png' | null>(null)

  const selectedFrame = selectedFrameIds.length === 1 ? frames.find((f) => f.id === selectedFrameIds[0]) ?? null : null

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const w = Number(width)
    const h = Number(height)
    if (!w || !h || w <= 0 || h <= 0) return
    createFrame({ width: w, height: h, unit })
  }

  const onFrameListClick = (e: MouseEvent, id: string) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) toggleFrameSelection(id)
    else selectFrame(id)
  }

  const runBulkExport = async (kind: 'pdf' | 'png') => {
    setBulkBusy(kind)
    try {
      const selected = frames.filter((f) => selectedFrameIds.includes(f.id))
      for (const f of selected) {
        if (kind === 'pdf') await exportFramePDF(f)
        else await exportFramePNG(f)
      }
    } finally {
      setBulkBusy(null)
    }
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
                className={selectedFrameIds.includes(f.id) ? 'active' : ''}
                onClick={(e) => onFrameListClick(e, f.id)}
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

          {selectedFrameIds.length > 1 && (
            <div className="selection-toolbar">
              <span className="selection-toolbar__count">{selectedFrameIds.length} selecionados</span>
              <div className="selection-toolbar__actions">
                <button
                  className="secondary"
                  type="button"
                  disabled={bulkBusy !== null}
                  onClick={() => runBulkExport('png')}
                >
                  {bulkBusy === 'png' ? 'Exportando…' : 'Exportar PNG'}
                </button>
                <button
                  className="secondary"
                  type="button"
                  disabled={bulkBusy !== null}
                  onClick={() => runBulkExport('pdf')}
                >
                  {bulkBusy === 'pdf' ? 'Exportando…' : 'Exportar PDF'}
                </button>
                <button className="secondary" type="button" onClick={() => removeFrames(selectedFrameIds)}>
                  Remover
                </button>
              </div>
            </div>
          )}
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
