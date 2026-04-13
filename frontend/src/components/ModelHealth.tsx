import { useEffect, useState } from 'react'

interface HealthResponse {
  status: string
  health_score: number
  message?: string
}

type HealthLevel = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN'

function getLevel(score: number): HealthLevel {
  if (score >= 0.8) return 'HEALTHY'
  if (score >= 0.5) return 'WARNING'
  return 'CRITICAL'
}

function levelColor(level: HealthLevel): string {
  switch (level) {
    case 'HEALTHY': return 'var(--success)'
    case 'WARNING': return 'var(--warning)'
    case 'CRITICAL': return 'var(--danger)'
    default: return 'var(--muted)'
  }
}

export function ModelHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchHealth() {
      try {
        const res = await fetch('http://localhost:8000/health')
        if (!res.ok) throw new Error('non-ok')
        const data = await res.json() as HealthResponse
        if (!cancelled) {
          setHealth(data)
          setError(false)
        }
      } catch {
        if (!cancelled) setError(true)
      }
    }

    fetchHealth()
    const interval = setInterval(fetchHealth, 5_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const score = health?.health_score ?? 0
  const level: HealthLevel = error ? 'UNKNOWN' : (health ? getLevel(score) : 'UNKNOWN')
  const color = levelColor(level)
  const pct = Math.round(score * 100)

  // SVG circle gauge
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const dash = circumference * (score ?? 0)

  return (
    <div
      className="rounded-lg p-4 flex flex-col items-center gap-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <h2
        className="text-sm font-semibold tracking-wider uppercase self-start"
        style={{ color: 'var(--accent)' }}
      >
        Model Health
      </h2>

      <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
        <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth="8"
          />
          {/* Progress */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-2xl font-bold tabular-nums"
            style={{ color }}
          >
            {health ? `${pct}%` : '—'}
          </span>
        </div>
      </div>

      {/* Pulsing status badge */}
      <div className="flex items-center gap-2">
        <span
          className="inline-block rounded-full"
          style={{
            width: 8,
            height: 8,
            background: color,
            boxShadow: `0 0 6px ${color}`,
            animation: level === 'HEALTHY' ? 'none' : 'pulse 1.5s ease-in-out infinite',
          }}
        />
        <span
          className="font-mono text-sm font-semibold tracking-widest"
          style={{ color }}
        >
          {level}
        </span>
      </div>

      {health?.message && (
        <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
          {health.message}
        </p>
      )}
    </div>
  )
}
