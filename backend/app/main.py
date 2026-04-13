from __future__ import annotations

import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

from app.config import settings
from app.drift import DriftDetector
from app.model import ModelService, PredictionRequest
from app.monitoring import (
    DRIFT_DETECTED,
    DRIFT_SCORE,
    MODEL_HEALTH,
    PREDICTION_LATENCY,
    PREDICTIONS_TOTAL,
)
from app.websocket import manager

app = FastAPI(
    title="SentinelBoard",
    description="Live ML Model Monitoring Dashboard",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Initialize services ---
model_service = ModelService(settings.model_path)

# Generate synthetic reference data for drift detection (replace with real training data)
np.random.seed(42)
reference_data = np.random.randn(1000, 5)  # 5 features, 1000 samples
drift_detector = DriftDetector(
    reference_data=reference_data,
    psi_threshold=settings.drift_psi_threshold,
    window_size=settings.drift_window_size,
)


@app.get("/health")
async def health() -> dict:
    return {
        "status": "healthy",
        "model_loaded": model_service.model is not None,
        "drift_status": "drifting" if drift_detector.is_drifting else "stable",
        "health_score": drift_detector.get_health_score(),
    }


@app.post("/predict")
async def predict(request: PredictionRequest):
    # Run prediction
    with PREDICTION_LATENCY.time():
        result = model_service.predict(request.features)

    PREDICTIONS_TOTAL.labels(status="success").inc()

    # Feed to drift detector
    drift_report = drift_detector.add_observation(request.features)
    if drift_report:
        for idx, score in drift_report["psi_scores"].items():
            DRIFT_SCORE.labels(feature_index=str(idx)).set(score)
        DRIFT_DETECTED.set(1.0 if drift_report["is_drifting"] else 0.0)

    MODEL_HEALTH.set(drift_detector.get_health_score())

    # Broadcast to WebSocket clients
    broadcast_data = {
        "type": "prediction",
        "data": result.model_dump(),
    }
    if drift_report:
        broadcast_data["drift"] = drift_report

    await manager.broadcast(broadcast_data)

    return result


@app.get("/metrics")
async def metrics():
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )


@app.get("/drift/history")
async def drift_history():
    return {
        "psi_history": drift_detector.psi_scores[-50:],
        "is_drifting": drift_detector.is_drifting,
        "health_score": drift_detector.get_health_score(),
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, handle client messages if needed
            data = await websocket.receive_text()
            # Client can send ping/config messages
            if data == "ping":
                await websocket.send_text('{"type": "pong"}')
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
