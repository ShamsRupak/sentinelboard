from __future__ import annotations

import numpy as np
from scipy import stats


def compute_psi(
    reference: np.ndarray,
    current: np.ndarray,
    n_bins: int = 10,
) -> float:
    """Compute Population Stability Index between reference and current distributions."""
    eps = 1e-6

    # Use reference distribution to define bin edges
    _, bin_edges = np.histogram(reference, bins=n_bins)

    ref_counts = np.histogram(reference, bins=bin_edges)[0] + eps
    cur_counts = np.histogram(current, bins=bin_edges)[0] + eps

    ref_pct = ref_counts / ref_counts.sum()
    cur_pct = cur_counts / cur_counts.sum()

    psi = float(np.sum((cur_pct - ref_pct) * np.log(cur_pct / ref_pct)))
    return round(psi, 6)


def ks_test(reference: np.ndarray, current: np.ndarray) -> tuple[float, float]:
    """Kolmogorov-Smirnov test. Returns (statistic, p_value)."""
    stat, p_value = stats.ks_2samp(reference, current)
    return round(float(stat), 6), round(float(p_value), 6)


class DriftDetector:
    def __init__(
        self,
        reference_data: np.ndarray,
        psi_threshold: float = 0.2,
        window_size: int = 100,
    ) -> None:
        self.reference = reference_data  # shape: (n_samples, n_features)
        self.psi_threshold = psi_threshold
        self.window_size = window_size
        self.buffer: list[list[float]] = []
        self.psi_scores: list[dict[int, float]] = []
        self.is_drifting = False

    def add_observation(self, features: list[float]) -> dict | None:
        """Add a new observation. Returns drift report if window is full."""
        self.buffer.append(features)

        if len(self.buffer) < self.window_size:
            return None

        # Compute PSI for each feature
        current = np.array(self.buffer)
        report: dict = {"psi_scores": {}, "drifting_features": [], "is_drifting": False}

        for i in range(self.reference.shape[1]):
            psi = compute_psi(self.reference[:, i], current[:, i])
            report["psi_scores"][i] = psi

            if psi > self.psi_threshold:
                report["drifting_features"].append(i)

        report["is_drifting"] = len(report["drifting_features"]) > 0
        self.is_drifting = report["is_drifting"]

        # KS test on first drifting feature (if any)
        if report["drifting_features"]:
            idx = report["drifting_features"][0]
            ks_stat, ks_p = ks_test(self.reference[:, idx], current[:, idx])
            report["ks_stat"] = ks_stat
            report["ks_p_value"] = ks_p

        self.psi_scores.append(report["psi_scores"])
        self.buffer = []  # Reset window

        return report

    def get_health_score(self) -> float:
        """Composite health score 0.0 (bad) to 1.0 (good)."""
        if not self.psi_scores:
            return 1.0
        latest = self.psi_scores[-1]
        max_psi = max(latest.values()) if latest else 0.0
        # Map PSI to health: 0 PSI = 1.0 health, 0.5+ PSI = 0.0 health
        return max(0.0, min(1.0, 1.0 - (max_psi / 0.5)))
