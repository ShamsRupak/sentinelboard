from __future__ import annotations

from prometheus_client import Counter, Gauge, Histogram

# Counters
PREDICTIONS_TOTAL = Counter(
    "sentinelboard_predictions_total",
    "Total number of predictions served",
    ["status"],
)

# Histograms
PREDICTION_LATENCY = Histogram(
    "sentinelboard_prediction_latency_seconds",
    "Prediction latency in seconds",
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
)

# Gauges
DRIFT_SCORE = Gauge(
    "sentinelboard_drift_psi_score",
    "Current PSI drift score",
    ["feature_index"],
)

DRIFT_DETECTED = Gauge(
    "sentinelboard_drift_detected",
    "Whether drift is currently detected (1=yes, 0=no)",
)

MODEL_HEALTH = Gauge(
    "sentinelboard_model_health",
    "Model health score 0-1",
)

CONNECTED_CLIENTS = Gauge(
    "sentinelboard_connected_ws_clients",
    "Number of connected WebSocket clients",
)
