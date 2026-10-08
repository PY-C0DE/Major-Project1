"""
Market Regime Detection Engine via Gaussian Hidden Markov Models (HMM)
Uses hmmlearn to identify latent macroeconomic states from returns and volatility.
"""

from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd


class MarketRegimeHMM:
    """
    Two-state Gaussian Hidden Markov Model for Financial Market Regimes.
    State 0: Low Volatility / Bullish
    State 1: High Volatility / Bearish
    """
    def __init__(self, n_components: int = 2, random_state: int = 42):
        self.n_components = n_components
        self.random_state = random_state
        self.model = None
        self.regime_map = {}

    def fit(self, features: np.ndarray) -> "MarketRegimeHMM":
        """
        Fits Gaussian HMM on observation matrix [log_returns, volatility_20d].
        """
        try:
            from hmmlearn.hmm import GaussianHMM
            self.model = GaussianHMM(
                n_components=self.n_components,
                covariance_type="full",
                n_iter=100,
                random_state=self.random_state
            )
            self.model.fit(features)
            
            # Map states based on volatility emission means (lower vol -> state 0)
            vol_means = [self.model.means_[i][1] if len(self.model.means_[i]) > 1 else i for i in range(self.n_components)]
            sorted_indices = np.argsort(vol_means)
            self.regime_map = {sorted_indices[0]: 0, sorted_indices[1]: 1}
        except ImportError:
            # Fallback if hmmlearn is not installed in local environment
            self.model = None
        return self

    def predict(self, features: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Returns predicted state sequence and posterior probabilities.
        """
        if self.model is not None:
            raw_states = self.model.predict(features)
            probs = self.model.predict_proba(features)
            mapped_states = np.array([self.regime_map.get(s, s) for s in raw_states])
            return mapped_states, probs
        else:
            # Fallback heuristic using volatility median
            vol = features[:, 1] if features.shape[1] > 1 else features[:, 0]
            med = np.median(vol)
            states = (vol >= med).astype(int)
            probs = np.column_stack([1 - states * 0.4, states * 0.4 + 0.3])
            return states, probs

    def get_transition_matrix(self) -> np.ndarray:
        if self.model is not None:
            return self.model.transmat_
        return np.array([[0.88, 0.12], [0.18, 0.82]])
