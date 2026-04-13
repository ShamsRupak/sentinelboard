import { useWebSocket } from './hooks/useWebSocket'
import { ModelHealth } from './components/ModelHealth'
import { LatencyGauge } from './components/LatencyGauge'
import { StatsSummary } from './components/StatsSummary'
import { PredictionFeed } from './components/PredictionFeed'
import { DriftChart } from './components/DriftChart'
import { AlertPanel } from './components/AlertPanel'

export default function App() {
  const { lastMessage, connectionStatus, predictions } = useWebSocket()

  return (
    <div
      className="min-h-screen p-4 flex flex-col gap-4"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Header */}
      <header className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div
            className="rounded w-2 h-6"
            style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }}
          />
          <h1
            className="font-mono text-lg font-bold tracking-widest uppercase"
            style={{ color: 'var(--accent)' }}
          >
            SentinelBoard
          </h1>
        </div>
        <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          ML Monitoring Dashboard
        </span>
      </header>

      {/* Top row: ModelHealth | LatencyGauge | StatsSummary */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: '1fr 1.6fr 1fr' }}
      >
        <ModelHealth />
        <LatencyGauge predictions={predictions} />
        <StatsSummary predictions={predictions} connectionStatus={connectionStatus} />
      </div>

      {/* Middle row: PredictionFeed */}
      <PredictionFeed predictions={predictions} />

      {/* Bottom row: DriftChart */}
      <DriftChart predictions={predictions} />

      {/* Alert toasts */}
      <AlertPanel lastMessage={lastMessage} />
    </div>
  )
}
