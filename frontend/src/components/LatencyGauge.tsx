import type { Prediction } from '../hooks/useWebSocket'

interface Props {
  predictions: Prediction[]
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function latencyColor(ms: number): string {
  if (ms < 10) return 'var(--success)'
  if (ms < 50) return 'var(--warning)'
  return 'var(--danger)'
}

interface StatProps {
  label: string
  value: number
}

function LatencyStat({ label, value }: StatProps) {
  const color = latencyColor(value)
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <span
        className="font-mono text-2xl font-semibold tabular-nums"
        style={{ color }}
      >
        {value.toFixed(1)}
      </span>
      <span className="text-xs" style={{ color: 'var(--muted)' }}>ms</span>
      <div
        className="w-full rounded-full mt-1"
        style={{ background: 'var(--border)', height: '3px' }}
      >
        <div
          style={{
            width: `${Math.min(100, (value / 100) * 100)}%`,
            height: '100%',
            background: color,
            borderRadius: '9999px',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  )
}

export function LatencyGauge({ predictions }: Props) {
  const latencies = predictions
    .map((p) => p.latency_ms)
    .filter((v) => typeof v === 'number')
    .sort((a, b) => a - b)

  const p50 = percentile(latencies, 50)
  const p95 = percentile(latencies, 95)
  const p99 = percentile(latencies, 99)

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <h2
        className="text-sm font-semibold tracking-wider uppercase"
        style={{ color: 'var(--accent)' }}
      >
        Latency
      </h2>

      <div className="grid grid-cols-3 gap-4">
        <LatencyStat label="p50" value={p50} />
        <LatencyStat label="p95" value={p95} />
        <LatencyStat label="p99" value={p99} />
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
        Last {latencies.length} predictions
      </p>
    </div>
  )
}
