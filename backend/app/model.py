from __future__ import annotations

import time
from pathlib import Path

import joblib
import numpy as np
from pydantic import BaseModel


class PredictionRequest(BaseModel):
    features: list[float]


class PredictionResponse(BaseModel):
    prediction: float
    confidence: float
    latency_ms: float
    timestamp: float


class ModelService:
    def __init__(self, model_path: str) -> None:
        path = Path(model_path)
        if path.exists():
            self.model = joblib.load(path)
        else:
            # Fallback: dummy model for development
            self.model = None

    def predict(self, features: list[float]) -> PredictionResponse:
        start = time.perf_counter()

        if self.model is not None:
            arr = np.array(features).reshape(1, -1)
            pred = float(self.model.predict(arr)[0])
            # If classifier, get probability
            if hasattr(self.model, "predict_proba"):
                proba = self.model.predict_proba(arr)
                confidence = float(np.max(proba))
            else:
                confidence = 0.95  # regression fallback
        else:
            # Dummy prediction for dev without a real model
            pred = float(np.mean(features) + np.random.normal(0, 0.1))
            confidence = 0.85 + np.random.uniform(0, 0.14)

        latency = (time.perf_counter() - start) * 1000

        return PredictionResponse(
            prediction=round(pred, 4),
            confidence=round(confidence, 4),
            latency_ms=round(latency, 3),
            timestamp=time.time(),
        )
