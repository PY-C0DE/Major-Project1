"""
Concept & Feature Distribution Drift Detector
Uses scipy.stats.ks_2samp to evaluate two-sample Kolmogorov-Smirnov tests
comparing training feature distributions against live inference data.
"""

from typing import Dict, List, Any
import numpy as np


def detect_feature_drift(
    training_features: np.ndarray,
    live_features: np.ndarray,
    feature_names: List[str],
    p_value_threshold: float = 0.05
) -> Dict[str, Any]:
    """
    Evaluates Kolmogorov-Smirnov test for each feature column.
    Flags drift if p_value < p_value_threshold.
    """
    from scipy.stats import ks_2samp

    feature_results = []
    drifting_count = 0

    for i, name in enumerate(feature_names):
        train_col = training_features[:, i]
        live_col = live_features[:, i]

        ks_stat, p_val = ks_2samp(train_col, live_col)
        drift_detected = bool(p_val < p_value_threshold)

        if drift_detected:
            drifting_count += 1

        feature_results.append({
            "feature": name,
            "ks_statistic": float(round(ks_stat, 3)),
            "p_value": float(round(p_val, 4)),
            "drift_detected": drift_detected,
            "training_mean": float(round(np.mean(train_col), 3)),
            "live_mean": float(round(np.mean(live_col), 3)),
            "status": "DRIFT DETECTED" if drift_detected else "NORMAL"
        })

    overall_drift = drifting_count >= 2
    return {
        "drift_detected": overall_drift,
        "drifting_features_count": drifting_count,
        "total_features_count": len(feature_names),
        "overall_drift_score": float(round(drifting_count / max(1, len(feature_names)), 2)),
        "feature_results": feature_results,
        "model_safety_warning": "Warning: Significant feature distribution drift detected. Re-calibration recommended." if overall_drift else None
    }
