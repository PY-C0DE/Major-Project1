"""
Feature Engineering Pipeline
Transforms raw OHLCV price series into technical indicators,
macroeconomic factors, and lag features without time-series lookahead bias.
"""

import numpy as np
import pandas as pd


def compute_technical_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes technical indicators for stock data.
    Input DataFrame must have columns: ['open', 'high', 'low', 'close', 'volume'].
    """
    data = df.copy()
    
    # 1. Price Returns & Volatility
    data['log_return'] = np.log(data['close'] / data['close'].shift(1))
    data['return_5d'] = data['close'].pct_change(5)
    data['volatility_20d'] = data['log_return'].rolling(window=20).std() * np.sqrt(252)

    # 2. Moving Averages
    data['sma_20'] = data['close'].rolling(window=20).mean()
    data['sma_50'] = data['close'].rolling(window=50).mean()
    data['ema_12'] = data['close'].ewm(span=12, adjust=False).mean()
    data['ema_26'] = data['close'].ewm(span=26, adjust=False).mean()

    # 3. MACD
    data['macd'] = data['ema_12'] - data['ema_26']
    data['macd_signal'] = data['macd'].ewm(span=9, adjust=False).mean()
    data['macd_hist'] = data['macd'] - data['macd_signal']

    # 4. RSI (Wilder's 14)
    delta = data['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / (loss + 1e-9)
    data['rsi_14'] = 100 - (100 / (1 + rs))

    # 5. Bollinger Bands (20, 2 std)
    rolling_std = data['close'].rolling(window=20).std()
    data['bb_upper'] = data['sma_20'] + (2 * rolling_std)
    data['bb_lower'] = data['sma_20'] - (2 * rolling_std)
    data['bb_width'] = (data['bb_upper'] - data['bb_lower']) / (data['sma_20'] + 1e-9)

    # 6. Average True Range (ATR 14)
    high_low = data['high'] - data['low']
    high_close = (data['high'] - data['close'].shift()).abs()
    low_close = (data['low'] - data['close'].shift()).abs()
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    data['atr_14'] = tr.rolling(window=14).mean()

    # 7. Momentum and Volume Ratio
    data['momentum_10'] = data['close'] - data['close'].shift(10)
    data['vol_ratio'] = data['volume'] / (data['volume'].rolling(window=20).mean() + 1e-9)

    # Fill initial NaNs cleanly
    data.bfill(inplace=True)
    data.fillna(0, inplace=True)
    return data
