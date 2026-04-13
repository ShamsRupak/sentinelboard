import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


class TestHealthEndpoint:
    async def test_health_returns_200(self, client):
        response = await client.get("/health")
        assert response.status_code == 200

    async def test_health_has_status(self, client):
        response = await client.get("/health")
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"


class TestPredictEndpoint:
    async def test_predict_returns_200(self, client):
        response = await client.post(
            "/predict", json={"features": [1.0, 2.0, 3.0, 4.0, 5.0]}
        )
        assert response.status_code == 200

    async def test_predict_returns_prediction(self, client):
        response = await client.post(
            "/predict", json={"features": [1.0, 2.0, 3.0, 4.0, 5.0]}
        )
        data = response.json()
        assert "prediction" in data
        assert "confidence" in data
        assert "latency_ms" in data

    async def test_predict_invalid_body_returns_422(self, client):
        response = await client.post("/predict", json={"wrong_field": [1.0]})
        assert response.status_code == 422


class TestMetricsEndpoint:
    async def test_metrics_returns_200(self, client):
        response = await client.get("/metrics")
        assert response.status_code == 200

    async def test_metrics_contains_prometheus_format(self, client):
        response = await client.get("/metrics")
        assert b"sentinelboard_predictions_total" in response.content


class TestDriftEndpoint:
    async def test_drift_history_returns_200(self, client):
        response = await client.get("/drift/history")
        assert response.status_code == 200
        data = response.json()
        assert "is_drifting" in data
        assert "health_score" in data
