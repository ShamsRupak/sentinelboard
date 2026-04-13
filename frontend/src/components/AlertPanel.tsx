import { useEffect, useRef, useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import type { WsMessage } from '../hooks/useWebSocket'

interface Alert {
  id: string
  message: string
  psi?: number
  timestamp: string
  exiting: boolean
}

interface Props {
  lastMessage: WsMessage | null
}

const MAX_ALERTS = 5
const AUTO_DISMISS_MS = 10_000

export function AlertPanel({ lastMessage }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  function dismiss(id: string) {
    // Mark as exiting to trigger slide-out
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, exiting: true } : a))
    )
    // Remove after animation
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    }, 300)

    const t = timersRef.current.get(id)
    if (t) {
      clearTimeout(t)
      timersRef.current.delete(id)
    }
  }

  // Watch for drift_detected in incoming messages
  useEffect(() => {
    if (!lastMessage) return
    const data = lastMessage.data
    if (!data?.drift_detected) return

    const id = `alert-${Date.now()}-${Math.random()}`
    const alert: Alert = {
      id,
      message: 'Drift detected in model input distribution',
      psi: data.psi_score,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      exiting: false,
    }

    setAlerts((prev) => {
      const next = [alert, ...prev].slice(0, MAX_ALERTS)
      return next
    })

    const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    timersRef.current.set(id, timer)
  }, [lastMessage])

  // Cleanup on unmount
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((t) => clearTimeout(t))
    }
  }, [])

  if (alerts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 flex flex-col gap-2 z-50"
      style={{ maxWidth: '360px', width: '100%' }}
    >
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={alert.exiting ? 'alert-exit' : 'alert-enter'}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--danger)',
            borderLeft: '4px solid var(--danger)',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 4px 20px rgba(255,51,102,0.2)',
          }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={16}
              style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {alert.message}
              </div>
              {alert.psi !== undefined && (
                <div className="font-mono text-xs mt-1" style={{ color: 'var(--danger)' }}>
                  PSI: {alert.psi.toFixed(4)}
                </div>
              )}
              <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                {alert.timestamp}
              </div>
            </div>
            <button
              onClick={() => dismiss(alert.id)}
              className="flex-shrink-0 rounded p-0.5 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Progress bar showing time remaining */}
          <div
            className="mt-2 rounded-full overflow-hidden"
            style={{ height: '2px', background: 'var(--border)' }}
          >
            <div
              style={{
                height: '100%',
                background: 'var(--danger)',
                animation: `shrink ${AUTO_DISMISS_MS}ms linear forwards`,
              }}
            />
          </div>
        </div>
      ))}

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}
