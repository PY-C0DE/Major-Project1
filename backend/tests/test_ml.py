"""
Unit Tests for Machine Learning and Quantitative Algorithms
Supports both numpy/scipy environments and pure-Python standard library fallbacks.
"""

import math
import unittest


class TestQuantitativeAlgorithms(unittest.TestCase):
    def test_conformal_quantile_calculation(self):
        """Tests empirical non-conformity quantile computation for 90% confidence."""
        residuals = [1.2, 2.5, 0.8, 3.1, 1.9, 0.4, 2.8, 1.5, 3.4, 0.9]
        residuals.sort()
        alpha = 0.10
        n = len(residuals)
        # q = ceil((n + 1) * (1 - alpha)) / n index
        q_idx = min(n - 1, max(0, math.ceil((n + 1) * (1 - alpha)) - 1))
        q_hat = residuals[q_idx]

        self.assertGreater(q_hat, 0)
        self.assertLessEqual(q_hat, max(residuals))

    def test_directional_accuracy_formula(self):
        """Tests directional accuracy calculations."""
        y_prev = [100, 105, 102, 110]
        y_true = [103, 102, 105, 115]  # actual: UP, DOWN, UP, UP
        y_pred = [104, 101, 106, 108]  # pred:   UP, DOWN, UP, DOWN (3/4 = 75%)

        correct = 0
        total = 0
        for i in range(len(y_prev)):
            actual_dir = 1 if y_true[i] > y_prev[i] else -1 if y_true[i] < y_prev[i] else 0
            pred_dir = 1 if y_pred[i] > y_prev[i] else -1 if y_pred[i] < y_prev[i] else 0
            if actual_dir != 0:
                total += 1
                if actual_dir == pred_dir:
                    correct += 1

        accuracy = (correct / total) * 100
        self.assertEqual(accuracy, 75.0)

    def test_two_sample_ks_statistic_identical(self):
        """Tests Kolmogorov-Smirnov supremum distance on identical distributions."""
        sample1 = [1.0, 2.0, 3.0, 4.0, 5.0]
        sample2 = [1.0, 2.0, 3.0, 4.0, 5.0]

        all_points = sorted(list(set(sample1 + sample2)))
        max_d = 0.0
        n1 = len(sample1)
        n2 = len(sample2)

        for x in all_points:
            cdf1 = sum(1 for v in sample1 if v <= x) / n1
            cdf2 = sum(1 for v in sample2 if v <= x) / n2
            diff = abs(cdf1 - cdf2)
            if diff > max_d:
                max_d = diff

        self.assertEqual(max_d, 0.0)

    def test_two_sample_ks_statistic_shifted(self):
        """Tests KS test detects shifted distribution (drift)."""
        sample1 = [1.0, 2.0, 3.0, 4.0, 5.0]
        sample2 = [10.0, 11.0, 12.0, 13.0, 14.0]

        all_points = sorted(list(set(sample1 + sample2)))
        max_d = 0.0
        n1 = len(sample1)
        n2 = len(sample2)

        for x in all_points:
            cdf1 = sum(1 for v in sample1 if v <= x) / n1
            cdf2 = sum(1 for v in sample2 if v <= x) / n2
            diff = abs(cdf1 - cdf2)
            if diff > max_d:
                max_d = diff

        # Non-overlapping samples must yield maximum divergence D = 1.0
        self.assertEqual(max_d, 1.0)


if __name__ == '__main__':
    unittest.main()
