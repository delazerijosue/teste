import { useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { computeLayout, resolveTaglineVariant } from '../lib/layout'
import { resolveEtiquetaAsset, resolveTaglineAsset } from '../lib/assets'
import { formatMeasurement } from '../lib/units'
import { getFrameLabel } from '../lib/frame'
import { exportFramePDF, exportFramePNG } from '../lib/export'
import './RightPanel.css'

export function RightPanel({ frameId }: { frameId: string }) {
  const frame = useStore((s) => s.frames.find((f) => f.id === frameId))
  const [busy, setBusy] = useState<'pdf' | 'png' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const variant = frame ? resolveTaglineVariant(frame.overrides) : 'a'
  const etiquetaAsset = frame ? resolveEtiquetaAsset(frame) : null
  const taglineAsset = frame ? resolveTaglineAsset(frame, variant) : null

  const layout = useMemo(() => {
    if (!frame || !etiquetaAsset || !taglineAsset) return null
    return computeLayout(frame.widthPx, frame.heightPx, frame.overrides, etiquetaAsset.aspectRatio, taglineAsset.aspectRatio)
  }, [frame, etiquetaAsset, taglineAsset])

  if (!frame || !layout || !etiquetaAsset || !taglineAsset) return null

  const runExport = async (kind: 'pdf' | 'png') => {
    setError(null)
    setBusy(kind)
    try {
      if (kind === 'pdf') await exportFramePDF(frame)
      else await exportFramePNG(frame)
    } catch (err) {
      console.error(err)
      setError('Falha ao exportar. Tente novamente.')
    } finally {
      setBusy(null)
    }
  }

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

      <div className="export-actions">
        <button onClick={() => runExport('pdf')} disabled={busy !== null}>
          {busy === 'pdf' ? 'Exportando…' : 'Exportar PDF'}
        </button>
        <button onClick={() => runExport('png')} disabled={busy !== null}>
          {busy === 'png' ? 'Exportando…' : 'Exportar PNG'}
        </button>
      </div>

      {error && <p className="export-error">{error}</p>}
    </div>
  )
}
