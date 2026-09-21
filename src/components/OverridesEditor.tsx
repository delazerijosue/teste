import { useMemo } from 'react'
import { useStore } from '../state/store'
import { computeLayout, resolveTaglineVariant, type TaglineVariant } from '../lib/layout'
import { ETIQUETA, TAGLINES } from '../lib/assets'
import { fromPx, toPx } from '../lib/units'
import type { Frame } from '../types'
import './OverridesEditor.css'

export function OverridesEditor({ frame }: { frame: Frame }) {
  const updateOverrides = useStore((s) => s.updateOverrides)
  const clearOverride = useStore((s) => s.clearOverride)

  const variant = resolveTaglineVariant(frame.overrides)
  const tagline = TAGLINES[variant]
  const layout = useMemo(
    () => computeLayout(frame.widthPx, frame.heightPx, frame.overrides, ETIQUETA.aspectRatio, tagline.aspectRatio),
    [frame.widthPx, frame.heightPx, frame.overrides, tagline.aspectRatio],
  )

  const unit = frame.unit
  const disp = (px: number) => Number(fromPx(px, unit).toFixed(unit === 'cm' ? 2 : 0))
  const step = unit === 'cm' ? 0.1 : 1

  const setPx = (key: 'marginTopSides' | 'marginBottom' | 'etiquetaHeight' | 'taglineWidth', displayValue: number) => {
    updateOverrides(frame.id, { [key]: toPx(displayValue, unit) })
  }

  const setEtiquetaPos = (axis: 'x' | 'y', displayValue: number) => {
    const current = frame.overrides.etiquetaPos ?? { x: layout.etiqueta.x, y: layout.etiqueta.y }
    updateOverrides(frame.id, {
      etiquetaPos: { ...current, [axis]: toPx(displayValue, unit) },
    })
  }

  return (
    <div className="overrides-editor">
      <fieldset>
        <legend>Etiqueta</legend>
        <div className="field-row">
          <div>
            <label>Posição X</label>
            <input
              type="number"
              step={step}
              value={disp(layout.etiqueta.x)}
              onChange={(e) => setEtiquetaPos('x', Number(e.target.value))}
            />
          </div>
          <div>
            <label>Posição Y</label>
            <input
              type="number"
              step={step}
              value={disp(layout.etiqueta.y)}
              onChange={(e) => setEtiquetaPos('y', Number(e.target.value))}
            />
          </div>
        </div>
        <div>
          <label>Altura ({unit})</label>
          <input
            type="number"
            step={step}
            min={step}
            value={disp(layout.etiqueta.height)}
            onChange={(e) => setPx('etiquetaHeight', Number(e.target.value))}
          />
        </div>
        <ResetRow
          show={!!(frame.overrides.etiquetaPos || frame.overrides.etiquetaHeight)}
          onReset={() => {
            clearOverride(frame.id, 'etiquetaPos')
            clearOverride(frame.id, 'etiquetaHeight')
          }}
        />
        {layout.etiqueta.wideMode && <p className="hint">Etiqueta larga: movida para a parte inferior.</p>}
      </fieldset>

      <fieldset>
        <legend>Margens</legend>
        <div>
          <label>Superior / laterais ({unit})</label>
          <input
            type="number"
            step={step}
            min={0}
            value={disp(layout.margin.top)}
            onChange={(e) => setPx('marginTopSides', Number(e.target.value))}
          />
        </div>
        <div>
          <label>Inferior ({unit})</label>
          <input
            type="number"
            step={step}
            min={0}
            value={disp(layout.margin.bottom)}
            onChange={(e) => setPx('marginBottom', Number(e.target.value))}
          />
        </div>
        <ResetRow
          show={!!(frame.overrides.marginTopSides || frame.overrides.marginBottom)}
          onReset={() => {
            clearOverride(frame.id, 'marginTopSides')
            clearOverride(frame.id, 'marginBottom')
          }}
        />
      </fieldset>

      <fieldset>
        <legend>Tagline</legend>
        <div className="variant-toggle">
          {(['a', 'b'] as TaglineVariant[]).map((v) => (
            <button
              key={v}
              type="button"
              className={variant === v ? '' : 'secondary'}
              onClick={() => updateOverrides(frame.id, { taglineVariant: v })}
            >
              Variante {v.toUpperCase()}
            </button>
          ))}
        </div>
        <div>
          <label>Largura ({unit})</label>
          <input
            type="number"
            step={step}
            min={step}
            value={disp(layout.tagline.width)}
            onChange={(e) => setPx('taglineWidth', Number(e.target.value))}
          />
        </div>
        <ResetRow
          show={!!frame.overrides.taglineWidth}
          onReset={() => clearOverride(frame.id, 'taglineWidth')}
        />
      </fieldset>
    </div>
  )
}

function ResetRow({ show, onReset }: { show: boolean; onReset: () => void }) {
  if (!show) return null
  return (
    <button type="button" className="secondary reset-btn" onClick={onReset}>
      Restaurar padrão
    </button>
  )
}
