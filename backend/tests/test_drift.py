import numpy as np
import pytest

from app.drift import DriftDetector, compute_psi, ks_test


class TestPSI:
    def test_identical_distributions_return_zero(self):
        data = np.random.randn(1000)
        psi = compute_psi(data, data)
        assert psi < 0.01

    def test_shifted_distribution_returns_high_psi(self):
        ref = np.random.randn(1000)
        shifted = ref + 3.0  # Big shift
        psi = compute_psi(ref, shifted)
        assert psi > 0.5

    def test_slight_shift_returns_moderate_psi(self):
        ref = np.random.randn(1000)
        shifted = ref + 0.3
        psi = compute_psi(ref, shifted)
        assert 0.01 < psi < 0.5


class TestKSTest:
    def test_same_distribution_high_p_value(self):
        data = np.random.randn(500)
        _, p = ks_test(data, data + np.random.normal(0, 0.01, 500))
        assert p > 0.01

    def test_different_distribution_low_p_value(self):
        a = np.random.randn(500)
        b = np.random.exponential(1, 500)
        _, p = ks_test(a, b)
        assert p < 0.05


class TestDriftDetector:
    @pytest.fixture
    def detector(self):
        np.random.seed(42)
        ref = np.random.randn(2000, 3)
        return DriftDetector(ref, psi_threshold=0.2, window_size=200)

    def test_no_drift_on_similar_data(self, detector):
        for _ in range(200):
            features = np.random.randn(3).tolist()
            report = detector.add_observation(features)
        # report is returned on the 200th call
        assert report is not None
        assert not report["is_drifting"]

    def test_drift_detected_on_shifted_data(self, detector):
        for _ in range(200):
            features = (np.random.randn(3) + 5.0).tolist()
            report = detector.add_observation(features)
        assert report is not None
        assert report["is_drifting"]
        assert len(report["drifting_features"]) > 0

    def test_health_score_decreases_with_drift(self, detector):
        initial = detector.get_health_score()
        for _ in range(200):
            detector.add_observation((np.random.randn(3) + 5.0).tolist())
        assert detector.get_health_score() < initial

    def test_buffer_resets_after_window(self, detector):
        for _ in range(200):
            detector.add_observation(np.random.randn(3).tolist())
        assert len(detector.buffer) == 0

    def test_partial_buffer_returns_none(self, detector):
        for i in range(199):
            report = detector.add_observation(np.random.randn(3).tolist())
            assert report is None
