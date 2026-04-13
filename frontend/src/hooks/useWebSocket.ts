import { useEffect, useRef, useState, useCallback } from 'react'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface Prediction {
  id: string
  timestamp: string
  prediction: number
  confidence: number
  latency_ms: number
  drift_detected?: boolean
  psi_score?: number
}

export interface WsMessage {
  type: string
  data: Prediction
}

interface UseWebSocketResult {
  lastMessage: WsMessage | null
  connectionStatus: ConnectionStatus
  predictions: Prediction[]
}

const MAX_PREDICTIONS = 100
const WS_URL = 'ws://localhost:8000/ws'
const MAX_BACKOFF_MS = 30_000

export function useWebSocket(): UseWebSocketResult {
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [predictions, setPredictions] = useState<Prediction[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountedRef = useRef(false)

  const connect = useCallback(() => {
    if (unmountedRef.current) return

    setConnectionStatus('connecting')

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      if (unmountedRef.current) return
      retryCountRef.current = 0
      setConnectionStatus('connected')
    }

    ws.onmessage = (event: MessageEvent) => {
      if (unmountedRef.current) return
      try {
        const msg = JSON.parse(event.data as string) as WsMessage
        setLastMessage(msg)

        if (msg.type === 'prediction' && msg.data) {
          const entry: Prediction = {
            id: `${Date.now()}-${Math.random()}`,
            ...msg.data,
          }
          setPredictions((prev) => [entry, ...prev].slice(0, MAX_PREDICTIONS))
        }
      } catch {
        // malformed message — ignore
      }
    }

    ws.onerror = () => {
      if (unmountedRef.current) return
      setConnectionStatus('error')
    }

    ws.onclose = () => {
      if (unmountedRef.current) return
      setConnectionStatus('disconnected')
      wsRef.current = null

      // Exponential backoff: 1s, 2s, 4s, 8s … capped at 30s
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), MAX_BACKOFF_MS)
      retryCountRef.current += 1
      retryTimerRef.current = setTimeout(connect, delay)
    }
  }, [])

  useEffect(() => {
    unmountedRef.current = false
    connect()

    return () => {
      unmountedRef.current = true
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null // prevent reconnect on intentional close
        wsRef.current.close()
      }
    }
  }, [connect])

  return { lastMessage, connectionStatus, predictions }
}
