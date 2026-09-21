import { useMemo, useRef, type ChangeEvent } from 'react'
import { useStore } from '../state/store'
import { computeLayout, resolveTaglineVariant, type TaglineVariant } from '../lib/layout'
import { resolveEtiquetaAsset, resolveTaglineAsset } from '../lib/assets'
import { loadCustomAsset, isAcceptedAssetFile } from '../lib/customAssets'
import { fromPx, toPx } from '../lib/units'
import type { Frame } from '../types'
import './OverridesEditor.css'

export function OverridesEditor({ frame }: { frame: Frame }) {
  const updateOverrides = useStore((s) => s.updateOverrides)
  const clearOverride = useStore((s) => s.clearOverride)
  const resizeFrame = useStore((s) => s.resizeFrame)
  const setCustomEtiqueta = useStore((s) => s.setCustomEtiqueta)
  const setCustomTagline = useStore((s) => s.setCustomTagline)

  const etiquetaInputRef = useRef<HTMLInputElement>(null)
  const taglineInputRef = useRef<HTMLInputElement>(null)

  const variant = resolveTaglineVariant(frame.overrides)
  const etiquetaAsset = resolveEtiquetaAsset(frame)
  const taglineAsset = resolveTaglineAsset(frame, variant)
  const layout = useMemo(
    () => computeLayout(frame.widthPx, frame.heightPx, frame.overrides, etiquetaAsset.aspectRatio, taglineAsset.aspectRatio),
    [frame.widthPx, frame.heightPx, frame.overrides, etiquetaAsset.aspectRatio, taglineAsset.aspectRatio],
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

  const onResize = (axis: 'width' | 'height', displayValue: number) => {
    if (!displayValue || displayValue <= 0) return
    const width = axis === 'width' ? displayValue : disp(frame.widthPx)
    const height = axis === 'height' ? displayValue : disp(frame.heightPx)
    resizeFrame(frame.id, width, height)
  }

  const onEtiquetaFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !isAcceptedAssetFile(file)) return
    const asset = await loadCustomAsset(file)
    setCustomEtiqueta(frame.id, asset)
  }

  const onTaglineFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !isAcceptedAssetFile(file)) return
    const asset = await loadCustomAsset(file)
    setCustomTagline(frame.id, asset)
  }

  return (
    <div className="overrides-editor">
      <fieldset>
        <legend>Tamanho do frame</legend>
        <div className="field-row">
          <div>
            <label>Largura ({unit})</label>
            <input
              type="number"
              step={step}
              min={step}
              value={disp(frame.widthPx)}
              onChange={(e) => onResize('width', Number(e.target.value))}
            />
          </div>
          <div>
            <label>Altura ({unit})</label>
            <input
              type="number"
              step={step}
              min={step}
              value={disp(frame.heightPx)}
              onChange={(e) => onResize('height', Number(e.target.value))}
            />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Etiqueta</legend>
        <p className="asset-status">
          {etiquetaAsset.isCustom ? 'Etiqueta personalizada enviada' : 'Usando etiqueta padrão do sistema'}
        </p>
        <div className="asset-actions">
          <button type="button" className="secondary" onClick={() => etiquetaInputRef.current?.click()}>
            Enviar etiqueta
          </button>
          {etiquetaAsset.isCustom && (
            <button type="button" className="secondary" onClick={() => setCustomEtiqueta(frame.id, null)}>
              Usar padrão
            </button>
          )}
        </div>
        <input
          ref={etiquetaInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          className="hidden-input"
          onChange={onEtiquetaFile}
        />

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
        <p className="asset-status">
          {taglineAsset.isCustom ? 'Tagline personalizada enviada' : `Usando variante padrão ${variant.toUpperCase()}`}
        </p>
        <div className="asset-actions">
          <button type="button" className="secondary" onClick={() => taglineInputRef.current?.click()}>
            Enviar tagline
          </button>
          {taglineAsset.isCustom && (
            <button type="button" className="secondary" onClick={() => setCustomTagline(frame.id, null)}>
              Usar padrão
            </button>
          )}
        </div>
        <input
          ref={taglineInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          className="hidden-input"
          onChange={onTaglineFile}
        />

        {!taglineAsset.isCustom && (
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
        )}
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
