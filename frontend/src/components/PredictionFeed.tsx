import { useRef, useEffect } from 'react'
import type { Prediction } from '../hooks/useWebSocket'

interface Props {
  predictions: Prediction[]
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ts
  }
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  let color = 'var(--danger)'
  if (value > 0.9) color = 'var(--success)'
  else if (value > 0.7) color = 'var(--warning)'

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 rounded-sm overflow-hidden"
        style={{ background: 'var(--border)', height: '6px' }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span
        className="font-mono text-xs w-9 text-right"
        style={{ color, minWidth: '2.25rem' }}
      >
        {pct}%
      </span>
    </div>
  )
}

export function PredictionFeed({ predictions }: Props) {
  const displayed = predictions.slice(0, 50)
  const prevLenRef = useRef(0)

  useEffect(() => {
    prevLenRef.current = displayed.length
  })

  return (
    <div
      className="rounded-lg overflow-hidden flex flex-col"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h2 className="text-sm font-semibold tracking-wider uppercase" style={{ color: 'var(--accent)' }}>
          Prediction Feed
        </h2>
        <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          {displayed.length} / 50
        </span>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              {['Time', 'Prediction', 'Confidence', 'Latency'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2 text-left text-xs uppercase tracking-wider font-medium"
                  style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((p, i) => {
              const isNew = i < displayed.length - prevLenRef.current + (prevLenRef.current === 0 ? displayed.length : 0)
              return (
                <tr
                  key={p.id}
                  className={isNew ? 'row-enter' : ''}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(26,26,36,0.4)',
                  }}
                >
                  <td className="px-4 py-2 font-mono text-xs" style={{ color: 'var(--muted)' }}>
                    {formatTime(p.timestamp)}
                  </td>
                  <td className="px-4 py-2 font-mono font-medium" style={{ color: 'var(--text)' }}>
                    {typeof p.prediction === 'number' ? p.prediction.toFixed(4) : p.prediction}
                  </td>
                  <td className="px-4 py-2" style={{ minWidth: '140px' }}>
                    <ConfidenceBar value={p.confidence} />
                  </td>
                  <td className="px-4 py-2 font-mono text-xs" style={{ color: 'var(--text)' }}>
                    {typeof p.latency_ms === 'number' ? `${p.latency_ms.toFixed(1)} ms` : '—'}
                  </td>
                </tr>
              )
            })}
            {displayed.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>
                  Waiting for predictions…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
