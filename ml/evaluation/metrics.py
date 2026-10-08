"""
Model Evaluation Metrics Suite
Computes regression metrics (MAE, RMSE, MAPE, R2) and Directional Accuracy.
"""

from typing import Dict, Any
import numpy as np


def calculate_directional_accuracy(y_true: np.ndarray, y_pred: np.ndarray, y_prev: np.ndarray) -> float:
    """
    Computes percentage of times predicted direction matches actual price direction:
    sign(y_pred - y_prev) == sign(y_true - y_prev)
    """
    actual_dir = np.sign(y_true - y_prev)
    pred_dir = np.sign(y_pred - y_prev)
    matches = (actual_dir == pred_dir) & (actual_dir != 0)
    valid_cases = np.sum(actual_dir != 0)
    if valid_cases == 0:
        return 50.0
    return float(round((np.sum(matches) / valid_cases) * 100, 2))


def evaluate_regression_model(y_true: np.ndarray, y_pred: np.ndarray, y_prev: np.ndarray) -> Dict[str, float]:
    """
    Calculates comprehensive financial forecasting performance metrics.
    """
    abs_errors = np.abs(y_true - y_pred)
    sq_errors = (y_true - y_pred) ** 2
    
    mae = float(round(np.mean(abs_errors), 2))
    mse = float(round(np.mean(sq_errors), 2))
    rmse = float(round(np.sqrt(mse), 2))
    mape = float(round(np.mean(abs_errors / np.maximum(y_true, 1e-6)) * 100, 2))
    
    # R-squared
    ss_res = np.sum(sq_errors)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    r2 = float(round(1 - (ss_res / max(ss_tot, 1e-6)), 3))
    
    dir_acc = calculate_directional_accuracy(y_true, y_pred, y_prev)
    
    return {
        "mae": mae,
        "mse": mse,
        "rmse": rmse,
        "mape": mape,
        "r2": r2,
        "directional_accuracy": dir_acc
    }
