import type { Prediction, ConnectionStatus } from '../hooks/useWebSocket'
import { Activity, Zap, TrendingUp, Wifi, WifiOff, Loader } from 'lucide-react'

interface Props {
  predictions: Prediction[]
  connectionStatus: ConnectionStatus
}

function StatusDot({ status }: { status: ConnectionStatus }) {
  const map: Record<ConnectionStatus, { color: string; label: string; Icon: typeof Wifi }> = {
    connected: { color: 'var(--success)', label: 'Connected', Icon: Wifi },
    connecting: { color: 'var(--warning)', label: 'Connecting…', Icon: Loader },
    disconnected: { color: 'var(--muted)', label: 'Disconnected', Icon: WifiOff },
    error: { color: 'var(--danger)', label: 'Error', Icon: WifiOff },
  }
  const { color, label, Icon } = map[status]
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={12} style={{ color }} />
      <span className="text-xs font-mono" style={{ color }}>
        {label}
      </span>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  color?: string
  icon: React.ReactNode
}

function StatCard({ label, value, sub, color = 'var(--text)', icon }: StatCardProps) {
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-1"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span style={{ color: 'var(--muted)' }}>{icon}</span>
        <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          {label}
        </span>
      </div>
      <span className="font-mono text-xl font-semibold tabular-nums" style={{ color }}>
        {value}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          {sub}
        </span>
      )}
    </div>
  )
}

export function StatsSummary({ predictions, connectionStatus }: Props) {
  const total = predictions.length
  const avgConf =
    total > 0
      ? predictions.reduce((s, p) => s + p.confidence, 0) / total
      : 0
  const driftCount = predictions.filter((p) => p.drift_detected).length

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <h2
          className="text-sm font-semibold tracking-wider uppercase"
          style={{ color: 'var(--accent)' }}
        >
          Stats
        </h2>
        <StatusDot status={connectionStatus} />
      </div>

      <div className="grid grid-cols-1 gap-2">
        <StatCard
          label="Total Preds"
          value={total}
          sub="in buffer"
          icon={<Activity size={12} />}
        />
        <StatCard
          label="Avg Confidence"
          value={`${(avgConf * 100).toFixed(1)}%`}
          color={avgConf > 0.9 ? 'var(--success)' : avgConf > 0.7 ? 'var(--warning)' : 'var(--danger)'}
          icon={<TrendingUp size={12} />}
        />
        <StatCard
          label="Drift Events"
          value={driftCount}
          color={driftCount > 0 ? 'var(--danger)' : 'var(--success)'}
          icon={<Zap size={12} />}
        />
      </div>
    </div>
  )
}
