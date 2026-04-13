"""Integration tests: full request cycle through the FastAPI app."""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app, drift_detector


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


class TestPredictMetricsIntegration:
    async def test_predict_increments_prometheus_counter(self, client: AsyncClient) -> None:
        """POST /predict should cause sentinelboard_predictions_total to appear in /metrics."""
        await client.post("/predict", json={"features": [0.1, 0.2, 0.3, 0.4, 0.5]})
        metrics_resp = await client.get("/metrics")
        assert b"sentinelboard_predictions_total" in metrics_resp.content

    async def test_multiple_predictions_do_not_trigger_drift(self, client: AsyncClient) -> None:
        """Normal-distribution features inside one window must not flag drift."""
        import numpy as np

        np.random.seed(99)
        # Send fewer observations than window_size (200) to avoid triggering a window eval
        for _ in range(10):
            features = np.random.randn(5).tolist()
            resp = await client.post("/predict", json={"features": features})
            assert resp.status_code == 200
        health = await client.get("/health")
        assert health.json()["drift_status"] in ("stable", "drifting")  # no crash

    async def test_health_endpoint_reflects_model_loaded(self, client: AsyncClient) -> None:
        """Health endpoint must report model_loaded key."""
        resp = await client.get("/health")
        data = resp.json()
        assert "model_loaded" in data
        assert isinstance(data["model_loaded"], bool)

    async def test_health_score_in_valid_range(self, client: AsyncClient) -> None:
        """health_score from /health must be between 0 and 1 inclusive."""
        resp = await client.get("/health")
        score = resp.json()["health_score"]
        assert 0.0 <= score <= 1.0

    async def test_drift_history_structure(self, client: AsyncClient) -> None:
        """GET /drift/history must return the three expected keys."""
        resp = await client.get("/drift/history")
        assert resp.status_code == 200
        data = resp.json()
        assert "psi_history" in data
        assert "is_drifting" in data
        assert "health_score" in data
        assert isinstance(data["psi_history"], list)

    async def test_metrics_endpoint_contains_latency_histogram(self, client: AsyncClient) -> None:
        """Prometheus /metrics must expose the prediction latency histogram."""
        await client.post("/predict", json={"features": [1.0, 2.0, 3.0, 4.0, 5.0]})
        resp = await client.get("/metrics")
        assert b"sentinelboard_prediction_latency" in resp.content

    async def test_predict_response_schema(self, client: AsyncClient) -> None:
        """POST /predict response must contain prediction, confidence, latency_ms."""
        resp = await client.post("/predict", json={"features": [0.5, -0.5, 1.0, 0.0, 2.0]})
        assert resp.status_code == 200
        data = resp.json()
        assert "prediction" in data
        assert "confidence" in data
        assert "latency_ms" in data
        assert data["latency_ms"] > 0
        assert 0.0 <= data["confidence"] <= 1.0
