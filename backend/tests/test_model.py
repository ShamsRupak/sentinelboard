import numpy as np
import pytest

from app.model import ModelService, PredictionRequest, PredictionResponse


class TestModelService:
    @pytest.fixture
    def service(self):
        return ModelService("nonexistent_path.joblib")  # Uses dummy model

    def test_predict_returns_response(self, service):
        result = service.predict([1.0, 2.0, 3.0, 4.0, 5.0])
        assert isinstance(result, PredictionResponse)

    def test_prediction_has_valid_confidence(self, service):
        result = service.predict([1.0, 2.0, 3.0])
        assert 0.0 <= result.confidence <= 1.0

    def test_prediction_has_positive_latency(self, service):
        result = service.predict([1.0, 2.0, 3.0])
        assert result.latency_ms > 0

    def test_prediction_has_timestamp(self, service):
        result = service.predict([1.0])
        assert result.timestamp > 0


class TestPredictionRequest:
    def test_valid_request(self):
        req = PredictionRequest(features=[1.0, 2.0, 3.0])
        assert len(req.features) == 3

    def test_empty_features(self):
        req = PredictionRequest(features=[])
        assert req.features == []
