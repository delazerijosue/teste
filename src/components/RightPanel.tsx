import { useMemo } from 'react'
import { useStore } from '../state/store'
import { computeLayout } from '../lib/layout'
import { formatMeasurement } from '../lib/units'
import { getFrameLabel, resolveFrameAssets } from '../lib/frame'
import './RightPanel.css'

export function RightPanel({ frameId }: { frameId: string }) {
  const frame = useStore((s) => s.frames.find((f) => f.id === frameId))

  const resolved = frame ? resolveFrameAssets(frame) : null
  const variant = resolved?.variant ?? 'a'
  const etiquetaAsset = resolved?.etiquetaAsset ?? null
  const taglineAsset = resolved?.taglineAsset ?? null

  const layout = useMemo(() => {
    if (!frame || !etiquetaAsset || !taglineAsset) return null
    return computeLayout(frame.widthPx, frame.heightPx, frame.overrides, etiquetaAsset.aspectRatio, taglineAsset.aspectRatio)
  }, [frame, etiquetaAsset, taglineAsset])

  if (!frame || !layout || !etiquetaAsset || !taglineAsset) return null

  return (
    <div className="right-panel">
      <h2>{getFrameLabel(frame)}</h2>

      <dl className="details-list">
        <div>
          <dt>Tamanho</dt>
          <dd>
            {formatMeasurement(frame.widthPx, frame.unit)} × {formatMeasurement(frame.heightPx, frame.unit)}
          </dd>
        </div>
        <div>
          <dt>Orientação</dt>
          <dd>{layout.orientation === 'vertical' ? 'Vertical' : 'Horizontal'}</dd>
        </div>
        <div>
          <dt>Foto</dt>
          <dd>{frame.photo ? 'Enviada' : 'Não enviada (espaço cinza)'}</dd>
        </div>
        <div>
          <dt>Etiqueta</dt>
          <dd>{etiquetaAsset.isCustom ? 'Personalizada' : 'Padrão do sistema'}</dd>
        </div>
        <div>
          <dt>Tagline</dt>
          <dd>{taglineAsset.isCustom ? 'Personalizada' : `Variante ${variant.toUpperCase()}`}</dd>
        </div>
        <div>
          <dt>Margem inferior</dt>
          <dd>
            {formatMeasurement(layout.margin.bottom, frame.unit)}
            {layout.etiqueta.wideMode ? ' (etiqueta larga)' : ''}
          </dd>
        </div>
      </dl>
    </div>
  )
}
