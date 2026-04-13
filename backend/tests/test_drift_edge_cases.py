"""Edge-case tests for drift detection logic."""
from __future__ import annotations

import numpy as np
import pytest

from app.drift import DriftDetector, compute_psi


class TestPSIEdgeCases:
    def test_uniform_distribution_low_psi(self) -> None:
        """Two identical uniform distributions should have near-zero PSI."""
        ref = np.random.uniform(0, 1, 1000)
        cur = np.random.uniform(0, 1, 1000)
        psi = compute_psi(ref, cur)
        assert psi < 0.1

    def test_very_large_shift_returns_high_psi(self) -> None:
        """A 10-sigma shift should produce very high PSI."""
        ref = np.random.randn(1000)
        cur = ref + 10.0
        psi = compute_psi(ref, cur)
        assert psi > 1.0

    def test_psi_is_non_negative(self) -> None:
        """PSI must always be >= 0."""
        ref = np.random.randn(500)
        cur = np.random.randn(500) + 0.5
        psi = compute_psi(ref, cur)
        assert psi >= 0.0

    def test_psi_symmetric_in_magnitude(self) -> None:
        """A positive and negative shift of the same size should give similar PSI."""
        ref = np.random.randn(2000)
        plus = compute_psi(ref, ref + 2.0)
        minus = compute_psi(ref, ref - 2.0)
        assert abs(plus - minus) < 0.5  # same order of magnitude


class TestDriftDetectorEdgeCases:
    def test_single_feature_detector(self) -> None:
        """DriftDetector must work with 1-feature data."""
        np.random.seed(0)
        ref = np.random.randn(500, 1)
        detector = DriftDetector(ref, psi_threshold=0.2, window_size=100)
        report = None
        for _ in range(100):
            report = detector.add_observation([np.random.randn()])
        assert report is not None
        assert "psi_scores" in report
        assert 0 in report["psi_scores"]

    def test_multiple_sequential_windows(self) -> None:
        """After two full windows of normal data both windows should be stable."""
        np.random.seed(7)
        ref = np.random.randn(1000, 2)
        detector = DriftDetector(ref, psi_threshold=0.2, window_size=200)
        reports = []
        for _ in range(400):
            r = detector.add_observation(np.random.randn(2).tolist())
            if r is not None:
                reports.append(r)
        assert len(reports) == 2
        for r in reports:
            assert not r["is_drifting"]

    def test_health_score_lower_bound_is_zero(self) -> None:
        """Health score must never go below 0 even under extreme drift."""
        np.random.seed(1)
        ref = np.random.randn(500, 2)
        detector = DriftDetector(ref, psi_threshold=0.2, window_size=100)
        for _ in range(100):
            detector.add_observation((np.random.randn(2) + 100.0).tolist())
        assert detector.get_health_score() >= 0.0

    def test_health_score_upper_bound_is_one(self) -> None:
        """Health score must never exceed 1.0."""
        np.random.seed(2)
        ref = np.random.randn(500, 2)
        detector = DriftDetector(ref, psi_threshold=0.2, window_size=100)
        # Before any window, score is 1.0
        assert detector.get_health_score() <= 1.0
        for _ in range(100):
            detector.add_observation(np.random.randn(2).tolist())
        assert detector.get_health_score() <= 1.0

    def test_drift_not_flagged_without_full_window(self) -> None:
        """is_drifting must stay False until the first full window is evaluated."""
        ref = np.random.randn(200, 3)
        detector = DriftDetector(ref, psi_threshold=0.2, window_size=50)
        for _ in range(49):
            detector.add_observation((np.random.randn(3) + 10.0).tolist())
        assert not detector.is_drifting
