import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { Prediction } from '../hooks/useWebSocket'

interface Props {
  predictions: Prediction[]
}

interface ChartPoint {
  time: string
  psi: number
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const psi: number = payload[0]?.value ?? 0
  const isAlert = psi >= 0.2

  return (
    <div
      className="rounded px-3 py-2 text-xs font-mono"
      style={{
        background: 'var(--surface-2)',
        border: `1px solid ${isAlert ? 'var(--danger)' : 'var(--border)'}`,
        color: 'var(--text)',
      }}
    >
      <div style={{ color: 'var(--muted)' }}>{label}</div>
      <div style={{ color: isAlert ? 'var(--danger)' : 'var(--accent)' }}>
        PSI: {psi.toFixed(4)}
      </div>
      {isAlert && (
        <div style={{ color: 'var(--danger)' }} className="mt-1">
          DRIFT DETECTED
        </div>
      )}
    </div>
  )
}

export function DriftChart({ predictions }: Props) {
  const data: ChartPoint[] = [...predictions]
    .reverse()
    .filter((p) => typeof p.psi_score === 'number')
    .map((p) => ({
      time: formatTime(p.timestamp),
      psi: p.psi_score ?? 0,
    }))
    .slice(-60) // last 60 data points

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-sm font-semibold tracking-wider uppercase"
          style={{ color: 'var(--accent)' }}
        >
          Drift Monitor — PSI Score
        </h2>
        <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--muted)' }}>
          <span
            className="inline-block w-6"
            style={{
              borderTop: '2px dashed var(--danger)',
              display: 'inline-block',
              verticalAlign: 'middle',
            }}
          />
          <span>Threshold 0.2</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="psiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />

          <XAxis
            dataKey="time"
            tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            interval="preserveStartEnd"
          />

          <YAxis
            tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            tickLine={false}
            axisLine={false}
            domain={[0, 'auto']}
          />

          <Tooltip content={<CustomTooltip />} />

          <ReferenceLine
            y={0.2}
            stroke="var(--danger)"
            strokeDasharray="6 4"
            strokeWidth={1.5}
          />

          <Area
            type="monotone"
            dataKey="psi"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#psiGradient)"
            dot={false}
            activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--bg)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {data.length === 0 && (
        <div
          className="flex items-center justify-center text-sm"
          style={{ height: '200px', marginTop: '-200px', color: 'var(--muted)' }}
        >
          No PSI data yet…
        </div>
      )}
    </div>
  )
}
