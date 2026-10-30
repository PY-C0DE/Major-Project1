/**
 * PortfolioCorrelation Component
 * High-performance, institutional D3 visualization of the pairwise Pearson
 * price correlation matrix across all assets in the user's active portfolio.
 *
 * Features:
 * - Dynamic D3 Heatmap Matrix with responsive layout & crosshair guidance
 * - 3 Color Palettes (Risk & Diversification, Cool Indigo, Classic Bipolar)
 * - Interactive Tooltip HUD with Pearson R, portfolio weightings, and risk analysis
 * - Multiple Ordering Algorithms (Allocation Weight, Alphabetical, Hierarchical Clustering)
 * - Filtering & Threshold Highlights (High Risk R >= 0.70, Diversifiers R < 0.30, Hedging R < 0)
 * - Metric Summary Telemetry (Average Portfolio Correlation, Diversification Score, Top Diversifying Pair)
 * - Multi-lookback recalculation (30D, 60D, 90D, 180D, 1Y)
 * - Full Dark/Light mode contrast & zero-pill design compliance
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Layers,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  Filter,
  Info,
  Maximize2,
  ExternalLink,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { PortfolioHolding, CorrelationAsset, CorrelationMatrixData } from '../types';
import { api } from '../services/api';

interface Props {
  holdings: PortfolioHolding[];
  correlationMatrix?: {
    tickers: string[];
    matrix: number[][];
  };
  onSelectTicker?: (ticker: string) => void;
  onAddPositionClick?: () => void;
  className?: string;
}

type ColorScheme = 'risk' | 'cool' | 'bipolar';
type SortMode = 'weight' | 'alphabetical' | 'cluster';
type FilterMode = 'all' | 'high_risk' | 'diversifiers' | 'hedges';
type LookbackWindow = '30D' | '60D' | '90D' | '180D' | '1Y';

interface HoveredCellData {
  rowTicker: string;
  colTicker: string;
  rowIdx: number;
  colIdx: number;
  value: number;
  x: number;
  y: number;
  rowName?: string;
  colName?: string;
  rowWeight?: number;
  colWeight?: number;
}

export const PortfolioCorrelation: React.FC<Props> = ({
  holdings,
  correlationMatrix: initialMatrix,
  onSelectTicker,
  onAddPositionClick,
  className = ''
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Controls state
  const [colorScheme, setColorScheme] = useState<ColorScheme>('risk');
  const [sortBy, setSortBy] = useState<SortMode>('weight');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [lookback, setLookback] = useState<LookbackWindow>('90D');
  const [showValues, setShowValues] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedCsv, setCopiedCsv] = useState<boolean>(false);

  // Active matrix data
  const [matrixData, setMatrixData] = useState<{
    tickers: string[];
    matrix: number[][];
    assets?: CorrelationAsset[];
    weights?: Record<string, number>;
  } | null>(() => {
    if (initialMatrix && initialMatrix.tickers && initialMatrix.tickers.length > 0) {
      return {
        tickers: initialMatrix.tickers,
        matrix: initialMatrix.matrix
      };
    }
    return null;
  });

  // Hover state
  const [hoveredCell, setHoveredCell] = useState<HoveredCellData | null>(null);
  const [selectedPair, setSelectedPair] = useState<HoveredCellData | null>(null);

  // DOM Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(640);

  // Measure container width responsively
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Update when initialMatrix changes if not custom fetched
  useEffect(() => {
    if (initialMatrix && initialMatrix.tickers.length > 0) {
      setMatrixData(prev => {
        // If already has enriched asset details from API, preserve weights
        return {
          tickers: initialMatrix.tickers,
          matrix: initialMatrix.matrix,
          assets: prev?.assets,
          weights: prev?.weights
        };
      });
    }
  }, [initialMatrix]);

  // Fetch or refresh correlation from backend
  const fetchCorrelation = async () => {
    if (!holdings || holdings.length < 2) return;
    setLoading(true);
    try {
      const daysMap: Record<LookbackWindow, number> = {
        '30D': 30,
        '60D': 60,
        '90D': 90,
        '180D': 180,
        '1Y': 252
      };
      const days = daysMap[lookback] || 90;
      const res = await api.getPortfolioCorrelation(holdings, days);
      if (res && res.tickers && res.matrix) {
        setMatrixData({
          tickers: res.tickers,
          matrix: res.matrix,
          assets: res.assets,
          weights: res.weights
        });
      }
    } catch (err) {
      console.warn('Could not fetch portfolio correlation via dedicated endpoint, using optimizer fallback:', err);
      // Fallback: If optimizer matrix exists, keep it
      if (initialMatrix) {
        setMatrixData({
          tickers: initialMatrix.tickers,
          matrix: initialMatrix.matrix
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch if matrixData is missing and we have >= 2 holdings
  useEffect(() => {
    if ((!matrixData || matrixData.tickers.length < 2) && holdings.length >= 2) {
      fetchCorrelation();
    }
  }, [holdings.length]);

  // Holding weights mapping
  const portfolioWeights = useMemo(() => {
    const totalVal = holdings.reduce((sum, h) => sum + (h.currentValue || (h.quantity * h.currentPrice)), 0) || 1;
    const map: Record<string, number> = {};
    const nameMap: Record<string, string> = {};
    holdings.forEach(h => {
      const val = h.currentValue || (h.quantity * h.currentPrice);
      map[h.ticker] = Number(((val / totalVal) * 100).toFixed(1));
      if (h.companyName) nameMap[h.ticker] = h.companyName;
    });
    return { weights: map, names: nameMap };
  }, [holdings]);

  // Tickers and Matrix ordering
  const { orderedTickers, orderedMatrix } = useMemo(() => {
    if (!matrixData || !matrixData.tickers || matrixData.tickers.length === 0) {
      return { orderedTickers: [], orderedMatrix: [] };
    }

    const rawTickers = [...matrixData.tickers];
    const rawMatrix = matrixData.matrix;
    const n = rawTickers.length;

    let indices = rawTickers.map((_, i) => i);

    if (sortBy === 'weight') {
      indices.sort((a, b) => {
        const wA = portfolioWeights.weights[rawTickers[a]] || 0;
        const wB = portfolioWeights.weights[rawTickers[b]] || 0;
        return wB - wA;
      });
    } else if (sortBy === 'alphabetical') {
      indices.sort((a, b) => rawTickers[a].localeCompare(rawTickers[b]));
    } else if (sortBy === 'cluster' && n > 2) {
      // Simple greedy correlation similarity clustering
      const visited = new Set<number>();
      const clustered: number[] = [];

      // Start with highest variance or first asset
      let current = 0;
      clustered.push(current);
      visited.add(current);

      while (clustered.length < n) {
        let bestNext = -1;
        let highestCorr = -Infinity;

        for (let candidate = 0; candidate < n; candidate++) {
          if (!visited.has(candidate)) {
            const corr = rawMatrix[current]?.[candidate] ?? 0;
            if (corr > highestCorr) {
              highestCorr = corr;
              bestNext = candidate;
            }
          }
        }

        if (bestNext !== -1) {
          clustered.push(bestNext);
          visited.add(bestNext);
          current = bestNext;
        } else {
          // Fallback if disconnected
          for (let i = 0; i < n; i++) {
            if (!visited.has(i)) {
              clustered.push(i);
              visited.add(i);
              break;
            }
          }
        }
      }
      indices = clustered;
    }

    const newTickers = indices.map(idx => rawTickers[idx]);
    const newMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(1));

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const origR = indices[r];
        const origC = indices[c];
        newMatrix[r][c] = rawMatrix[origR]?.[origC] ?? (r === c ? 1.0 : 0.0);
      }
    }

    return { orderedTickers: newTickers, orderedMatrix: newMatrix };
  }, [matrixData, sortBy, portfolioWeights]);

  // Summary Metrics: Average correlation, diversification ratio, max/min pairs
  const summaryMetrics = useMemo(() => {
    if (!orderedTickers.length || !orderedMatrix.length || orderedTickers.length < 2) {
      return {
        avgCorr: 0,
        diversificationScore: 100,
        minPair: null as { tA: string; tB: string; r: number } | null,
        maxPair: null as { tA: string; tB: string; r: number } | null,
        highRiskPairsCount: 0,
        hedgingPairsCount: 0,
        totalPairsCount: 0
      };
    }

    const n = orderedTickers.length;
    let sumCorr = 0;
    let count = 0;
    let minR = Infinity;
    let maxR = -Infinity;
    let minPair = { tA: '', tB: '', r: 0 };
    let maxPair = { tA: '', tB: '', r: 0 };
    let highRiskCount = 0;
    let hedgingCount = 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const val = orderedMatrix[i][j];
        sumCorr += val;
        count++;

        if (val < minR) {
          minR = val;
          minPair = { tA: orderedTickers[i], tB: orderedTickers[j], r: val };
        }
        if (val > maxR) {
          maxR = val;
          maxPair = { tA: orderedTickers[i], tB: orderedTickers[j], r: val };
        }

        if (val >= 0.70) highRiskCount++;
        if (val < 0) hedgingCount++;
      }
    }

    const avgCorr = count > 0 ? Number((sumCorr / count).toFixed(2)) : 0;
    // Diversification score: 100 for zero/negative correlation, scaling down as average correlation approaches 1.0
    const rawScore = (1 - Math.max(0, avgCorr)) * 100;
    const diversificationScore = Math.max(5, Math.min(100, Math.round(rawScore)));

    return {
      avgCorr,
      diversificationScore,
      minPair: count > 0 ? minPair : null,
      maxPair: count > 0 ? maxPair : null,
      highRiskPairsCount: highRiskCount,
      hedgingPairsCount: hedgingCount,
      totalPairsCount: count
    };
  }, [orderedTickers, orderedMatrix]);

  // Color Interpolator function based on selected scheme
  const getColor = (r: number, isDiag: boolean): string => {
    if (isDiag) {
      return isDark ? '#1e293b' : '#f1f5f9'; // Neutral slate for diagonal self-correlation
    }

    if (colorScheme === 'risk') {
      // Risk & Diversification Scheme:
      // Negative / Hedging ([-1, 0)): Emerald / Forest Green
      // Low / Uncorrelated ([0, 0.35)): Cyan / Teal
      // Moderate ([0.35, 0.70)): Amber / Gold
      // High Correlation ([0.70, 1.0]): Rose / Crimson
      if (r < 0) {
        // Emerald gradient
        const t = Math.min(1, Math.abs(r));
        return isDark
          ? d3.interpolateRgb('#064e3b', '#10b981')(t)
          : d3.interpolateRgb('#a7f3d0', '#059669')(t);
      } else if (r < 0.35) {
        // Cyan / Teal
        const t = r / 0.35;
        return isDark
          ? d3.interpolateRgb('#0e7490', '#06b6d4')(t)
          : d3.interpolateRgb('#cffafe', '#0891b2')(t);
      } else if (r < 0.70) {
        // Amber
        const t = (r - 0.35) / 0.35;
        return isDark
          ? d3.interpolateRgb('#78350f', '#f59e0b')(t)
          : d3.interpolateRgb('#fef3c7', '#d97706')(t);
      } else {
        // Rose / Red (High risk co-movement)
        const t = Math.min(1, (r - 0.70) / 0.30);
        return isDark
          ? d3.interpolateRgb('#881337', '#f43f5e')(t)
          : d3.interpolateRgb('#ffe4e6', '#e11d48')(t);
      }
    } else if (colorScheme === 'cool') {
      // Cool Indigo / Violet Scheme
      // -1 (Deep Blue) -> 0 (Cyan) -> 0.5 (Indigo) -> 1.0 (Violet)
      const normalized = (r + 1) / 2; // [0, 1]
      return d3.interpolateSpectral(1 - normalized);
    } else {
      // Classic Bipolar (Green to Red through White/Slate)
      // Negative: Emerald, Zero: Slate, Positive: Crimson
      if (r < 0) {
        const t = Math.abs(r);
        return isDark
          ? d3.interpolateRgb('#1e293b', '#10b981')(t)
          : d3.interpolateRgb('#ffffff', '#059669')(t);
      } else {
        const t = r;
        return isDark
          ? d3.interpolateRgb('#1e293b', '#e11d48')(t)
          : d3.interpolateRgb('#ffffff', '#be123c')(t);
      }
    }
  };

  // Get text color with WCAG contrast based on background
  const getCellTextColor = (r: number, isDiag: boolean): string => {
    if (isDiag) {
      return isDark ? '#94a3b8' : '#64748b';
    }
    if (isDark) {
      if (colorScheme === 'risk') {
        return '#f8fafc';
      }
      return '#ffffff';
    } else {
      // Light theme
      if (colorScheme === 'risk') {
        if (r < 0) return '#064e3b';
        if (r < 0.35) return '#083344';
        if (r < 0.70) return '#78350f';
        return '#881337';
      }
      return Math.abs(r) > 0.4 ? '#ffffff' : '#0f172a';
    }
  };

  // Check if cell matches active filter
  const isCellHighlighted = (val: number, isDiag: boolean): boolean => {
    if (isDiag) return true;
    if (filterMode === 'all') return true;
    if (filterMode === 'high_risk') return val >= 0.70;
    if (filterMode === 'diversifiers') return val < 0.30 && val >= 0;
    if (filterMode === 'hedges') return val < 0;
    return true;
  };

  // Render D3 Heatmap SVG
  useEffect(() => {
    if (!svgRef.current || !orderedTickers.length || !orderedMatrix.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const n = orderedTickers.length;

    // Dynamic layout margins based on ticker label lengths
    const maxLabelLen = Math.max(...orderedTickers.map(t => t.length), 4);
    const leftMargin = Math.min(130, Math.max(75, maxLabelLen * 8.5 + 20));
    const topMargin = Math.min(120, Math.max(70, maxLabelLen * 7 + 25));
    const rightMargin = 30;
    const bottomMargin = 45;

    // Available width and height for matrix grid
    const availableWidth = containerWidth - leftMargin - rightMargin;
    // Calculate cell dimension
    const maxCellSize = 64;
    const minCellSize = 34;
    let cellSize = Math.floor(availableWidth / n);
    cellSize = Math.max(minCellSize, Math.min(maxCellSize, cellSize));

    const gridWidth = cellSize * n;
    const gridHeight = cellSize * n;
    const totalSvgWidth = gridWidth + leftMargin + rightMargin;
    const totalSvgHeight = gridHeight + topMargin + bottomMargin;

    svg
      .attr('width', totalSvgWidth)
      .attr('height', totalSvgHeight)
      .attr('viewBox', `0 0 ${totalSvgWidth} ${totalSvgHeight}`)
      .style('max-width', '100%')
      .style('height', 'auto');

    const g = svg
      .append('g')
      .attr('transform', `translate(${leftMargin}, ${topMargin})`);

    // Crosshair guide layer (behind cells)
    const guidesGroup = g.append('g').attr('class', 'guides-group');
    const rowGuide = guidesGroup
      .append('rect')
      .attr('class', 'row-guide')
      .attr('x', 0)
      .attr('width', gridWidth)
      .attr('height', cellSize)
      .attr('fill', isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(6, 182, 212, 0.08)')
      .style('opacity', 0)
      .style('pointer-events', 'none');

    const colGuide = guidesGroup
      .append('rect')
      .attr('class', 'col-guide')
      .attr('y', 0)
      .attr('width', cellSize)
      .attr('height', gridHeight)
      .attr('fill', isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(6, 182, 212, 0.08)')
      .style('opacity', 0)
      .style('pointer-events', 'none');

    // Matrix Cells Group
    const cellsGroup = g.append('g').attr('class', 'cells-group');

    for (let r = 0; r < n; r++) {
      const rowTicker = orderedTickers[r];
      const rowWeight = portfolioWeights.weights[rowTicker];
      const rowName = portfolioWeights.names[rowTicker] || rowTicker;

      for (let c = 0; c < n; c++) {
        const colTicker = orderedTickers[c];
        const colWeight = portfolioWeights.weights[colTicker];
        const colName = portfolioWeights.names[colTicker] || colTicker;
        const val = orderedMatrix[r][c];
        const isDiag = r === c;
        const cellHighlight = isCellHighlighted(val, isDiag);

        const x = c * cellSize;
        const y = r * cellSize;
        const cellColor = getColor(val, isDiag);
        const cellTextColor = getCellTextColor(val, isDiag);

        const cellGroup = cellsGroup
          .append('g')
          .attr('class', `cell-group cell-${r}-${c}`)
          .attr('transform', `translate(${x}, ${y})`)
          .style('cursor', 'pointer');

        // Cell Rectangle
        const rect = cellGroup
          .append('rect')
          .attr('width', cellSize - 2)
          .attr('height', cellSize - 2)
          .attr('rx', 4)
          .attr('ry', 4)
          .attr('fill', cellColor)
          .attr('stroke', isDark ? '#0f172a' : '#ffffff')
          .attr('stroke-width', 1.5)
          .style('opacity', cellHighlight ? 1 : 0.22)
          .style('transition', 'all 0.15s ease');

        // Diagonal pattern indicator
        if (isDiag) {
          cellGroup
            .append('line')
            .attr('x1', 4)
            .attr('y1', cellSize - 6)
            .attr('x2', cellSize - 6)
            .attr('y2', 4)
            .attr('stroke', isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(100, 116, 139, 0.35)')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '2,2');
        }

        // Cell Text Label (Correlation Value)
        if (showValues && cellSize >= 38) {
          const fontSize = cellSize > 54 ? '11px' : '9.5px';
          cellGroup
            .append('text')
            .attr('x', (cellSize - 2) / 2)
            .attr('y', (cellSize - 2) / 2 + (cellSize > 54 ? 4 : 3.5))
            .attr('text-anchor', 'middle')
            .attr('fill', cellTextColor)
            .attr('font-size', fontSize)
            .attr('font-family', 'monospace')
            .attr('font-weight', isDiag ? '500' : '700')
            .style('pointer-events', 'none')
            .style('opacity', cellHighlight ? 1 : 0.3)
            .text(isDiag ? '1.0' : (val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)));
        }

        // Cell Interactive Events
        cellGroup
          .on('mouseenter', (event) => {
            rect
              .attr('stroke', isDark ? '#38bdf8' : '#0284c7')
              .attr('stroke-width', 2.5);

            // Show guides
            rowGuide.attr('y', y).style('opacity', 1);
            colGuide.attr('x', x).style('opacity', 1);

            // Highlight axis labels
            svg.selectAll(`.axis-label-x-${c}`).attr('fill', isDark ? '#38bdf8' : '#0284c7').attr('font-weight', '800');
            svg.selectAll(`.axis-label-y-${r}`).attr('fill', isDark ? '#38bdf8' : '#0284c7').attr('font-weight', '800');

            const [mx, my] = d3.pointer(event, containerRef.current);

            setHoveredCell({
              rowTicker,
              colTicker,
              rowIdx: r,
              colIdx: c,
              value: val,
              x: mx,
              y: my,
              rowName,
              colName,
              rowWeight,
              colWeight
            });
          })
          .on('mousemove', (event) => {
            const [mx, my] = d3.pointer(event, containerRef.current);
            setHoveredCell(prev => prev ? { ...prev, x: mx, y: my } : null);
          })
          .on('mouseleave', () => {
            rect
              .attr('stroke', isDark ? '#0f172a' : '#ffffff')
              .attr('stroke-width', 1.5);

            rowGuide.style('opacity', 0);
            colGuide.style('opacity', 0);

            svg.selectAll(`.axis-label-x-${c}`).attr('fill', isDark ? '#94a3b8' : '#475569').attr('font-weight', '600');
            svg.selectAll(`.axis-label-y-${r}`).attr('fill', isDark ? '#94a3b8' : '#475569').attr('font-weight', '600');

            setHoveredCell(null);
          })
          .on('click', () => {
            setSelectedPair({
              rowTicker,
              colTicker,
              rowIdx: r,
              colIdx: c,
              value: val,
              x: 0,
              y: 0,
              rowName,
              colName,
              rowWeight,
              colWeight
            });
            if (onSelectTicker) {
              onSelectTicker(rowTicker);
            }
          });
      }
    }

    // Top X-Axis Headers (Tickers)
    const xAxisGroup = g.append('g').attr('class', 'x-axis-group');
    orderedTickers.forEach((ticker, i) => {
      const x = i * cellSize + cellSize / 2;
      const weight = portfolioWeights.weights[ticker];

      const label = xAxisGroup
        .append('g')
        .attr('transform', `translate(${x}, -12)`)
        .style('cursor', 'pointer')
        .on('click', () => onSelectTicker?.(ticker));

      label
        .append('text')
        .attr('class', `axis-label-x axis-label-x-${i}`)
        .attr('transform', 'rotate(-38)')
        .attr('text-anchor', 'start')
        .attr('fill', isDark ? '#94a3b8' : '#475569')
        .attr('font-size', cellSize < 44 ? '10px' : '11.5px')
        .attr('font-weight', '600')
        .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        .text(ticker);

      if (weight !== undefined && cellSize >= 50) {
        label
          .append('text')
          .attr('transform', 'rotate(-38)')
          .attr('dx', ticker.length * 7.5 + 4)
          .attr('fill', isDark ? '#64748b' : '#94a3b8')
          .attr('font-size', '9px')
          .attr('font-family', 'sans-serif')
          .text(`(${weight}%)`);
      }
    });

    // Left Y-Axis Headers (Tickers)
    const yAxisGroup = g.append('g').attr('class', 'y-axis-group');
    orderedTickers.forEach((ticker, i) => {
      const y = i * cellSize + cellSize / 2;
      const weight = portfolioWeights.weights[ticker];

      const label = yAxisGroup
        .append('g')
        .attr('transform', `translate(-12, ${y})`)
        .style('cursor', 'pointer')
        .on('click', () => onSelectTicker?.(ticker));

      label
        .append('text')
        .attr('class', `axis-label-y axis-label-y-${i}`)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('fill', isDark ? '#94a3b8' : '#475569')
        .attr('font-size', cellSize < 44 ? '10.5px' : '11.5px')
        .attr('font-weight', '600')
        .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        .text(ticker);

      if (weight !== undefined && cellSize >= 50) {
        label
          .append('text')
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'middle')
          .attr('dx', -(ticker.length * 8 + 4))
          .attr('fill', isDark ? '#64748b' : '#94a3b8')
          .attr('font-size', '9px')
          .attr('font-family', 'sans-serif')
          .text(`${weight}%`);
      }
    });

    // Correlation Color Bar Legend at bottom
    const legendGroup = g
      .append('g')
      .attr('class', 'legend-group')
      .attr('transform', `translate(0, ${gridHeight + 18})`);

    const legendWidth = Math.min(gridWidth, 320);
    const legendHeight = 10;

    // Define Linear Gradient
    const defs = svg.append('defs');
    const gradId = `legend-gradient-${colorScheme}`;
    defs.selectAll(`#${gradId}`).remove();

    const gradient = defs
      .append('linearGradient')
      .attr('id', gradId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    if (colorScheme === 'risk') {
      gradient.append('stop').attr('offset', '0%').attr('stop-color', getColor(-1.0, false));
      gradient.append('stop').attr('offset', '25%').attr('stop-color', getColor(-0.2, false));
      gradient.append('stop').attr('offset', '50%').attr('stop-color', getColor(0.2, false));
      gradient.append('stop').attr('offset', '75%').attr('stop-color', getColor(0.65, false));
      gradient.append('stop').attr('offset', '100%').attr('stop-color', getColor(1.0, false));
    } else if (colorScheme === 'cool') {
      gradient.append('stop').attr('offset', '0%').attr('stop-color', getColor(-1.0, false));
      gradient.append('stop').attr('offset', '50%').attr('stop-color', getColor(0.0, false));
      gradient.append('stop').attr('offset', '100%').attr('stop-color', getColor(1.0, false));
    } else {
      gradient.append('stop').attr('offset', '0%').attr('stop-color', getColor(-1.0, false));
      gradient.append('stop').attr('offset', '50%').attr('stop-color', isDark ? '#1e293b' : '#f1f5f9');
      gradient.append('stop').attr('offset', '100%').attr('stop-color', getColor(1.0, false));
    }

    // Legend Rect
    legendGroup
      .append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('fill', `url(#${gradId})`)
      .attr('stroke', isDark ? '#334155' : '#cbd5e1')
      .attr('stroke-width', 1);

    // Legend Tick Labels
    const ticks = [-1.0, -0.5, 0.0, 0.5, 1.0];
    ticks.forEach(t => {
      const pos = ((t + 1) / 2) * legendWidth;
      legendGroup
        .append('line')
        .attr('x1', pos)
        .attr('y1', legendHeight)
        .attr('x2', pos)
        .attr('y2', legendHeight + 4)
        .attr('stroke', isDark ? '#64748b' : '#94a3b8')
        .attr('stroke-width', 1);

      legendGroup
        .append('text')
        .attr('x', pos)
        .attr('y', legendHeight + 14)
        .attr('text-anchor', 'middle')
        .attr('fill', isDark ? '#94a3b8' : '#64748b')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .text(t > 0 ? `+${t.toFixed(1)}` : t.toFixed(1));
    });

    // Legend Sub-annotations
    legendGroup
      .append('text')
      .attr('x', 0)
      .attr('y', legendHeight + 25)
      .attr('text-anchor', 'start')
      .attr('fill', isDark ? '#34d399' : '#059669')
      .attr('font-size', '8.5px')
      .attr('font-weight', '600')
      .text('Hedging / Inverse');

    legendGroup
      .append('text')
      .attr('x', legendWidth / 2)
      .attr('y', legendHeight + 25)
      .attr('text-anchor', 'middle')
      .attr('fill', isDark ? '#38bdf8' : '#0284c7')
      .attr('font-size', '8.5px')
      .attr('font-weight', '600')
      .text('Uncorrelated');

    legendGroup
      .append('text')
      .attr('x', legendWidth)
      .attr('y', legendHeight + 25)
      .attr('text-anchor', 'end')
      .attr('fill', isDark ? '#fb7185' : '#e11d48')
      .attr('font-size', '8.5px')
      .attr('font-weight', '600')
      .text('Co-Moving');

  }, [
    orderedTickers,
    orderedMatrix,
    containerWidth,
    colorScheme,
    showValues,
    filterMode,
    isDark,
    portfolioWeights
  ]);

  // Export Matrix to CSV
  const handleExportCsv = () => {
    if (!orderedTickers.length || !orderedMatrix.length) return;
    const header = ['Asset', ...orderedTickers].join(',');
    const rows = orderedTickers.map((t, r) => {
      const vals = orderedMatrix[r].map(v => v.toFixed(3));
      return [t, ...vals].join(',');
    });
    const csvContent = [header, ...rows].join('\n');
    navigator.clipboard.writeText(csvContent);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2500);
  };

  // Export SVG snapshot
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `portfolio-correlation-matrix-${lookback.toLowerCase()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Empty / Single asset state
  if (!holdings || holdings.length < 2) {
    return (
      <div className={`p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>
        <div className="max-w-xl mx-auto text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Pairwise Correlation Matrix Requires ≥ 2 Positions
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Harry Markowitz’s Modern Portfolio Theory (MPT) calculates cross-asset covariance
              <code className="mx-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-cyan-600 dark:text-cyan-400">
                Cov(R_i, R_j)
              </code>
              and Pearson correlation to isolate uncompensated concentration risk. Add a second position to unlock
              instant heatmapping, diversification scoring, and risk clustering.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            {onAddPositionClick && (
              <button
                onClick={onAddPositionClick}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Position to Portfolio</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`} ref={containerRef}>
      {/* Top Header & Telemetry Cards */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Title Bar & Quick Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-500">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Portfolio Correlation Matrix
              </h3>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">
                D3 Heatmap
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pairwise Pearson price correlation (R ∈ [-1.0, +1.0]) evaluating diversification & systemic co-movement
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Lookback Selector */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              {(['30D', '60D', '90D', '180D', '1Y'] as LookbackWindow[]).map(win => (
                <button
                  key={win}
                  onClick={() => {
                    setLookback(win);
                    fetchCorrelation();
                  }}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer font-mono text-[11px] ${
                    lookback === win
                      ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {win}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchCorrelation}
              disabled={loading}
              title="Recalculate Correlation Matrix"
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-500' : ''}`} />
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCsv}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Copy correlation matrix to CSV"
            >
              {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{copiedCsv ? 'Copied' : 'CSV'}</span>
            </button>

            {/* Export SVG */}
            <button
              onClick={handleExportSvg}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Download SVG vector graphic"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Summary Telemetry Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Average Correlation Card */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Avg Correlation (R̄)</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                summaryMetrics.avgCorr < 0.35
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : summaryMetrics.avgCorr < 0.65
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
              }`}>
                {summaryMetrics.avgCorr < 0.35 ? 'Low Co-movement' : summaryMetrics.avgCorr < 0.65 ? 'Moderate' : 'High Co-movement'}
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              {summaryMetrics.avgCorr > 0 ? `+${summaryMetrics.avgCorr.toFixed(2)}` : summaryMetrics.avgCorr.toFixed(2)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Across {summaryMetrics.totalPairsCount} unique holding pairs
            </span>
          </div>

          {/* Diversification Score Card */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Diversification Score</span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            </div>
            <div className="text-xl font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-1">
              {summaryMetrics.diversificationScore}
              <span className="text-xs text-slate-400 font-normal"> / 100</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {summaryMetrics.diversificationScore >= 75
                ? 'Strong variance dampening'
                : summaryMetrics.diversificationScore >= 50
                ? 'Balanced asset mix'
                : 'Elevated concentration'}
            </span>
          </div>

          {/* Best Diversifying Pair Card */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Top Diversifier Pair</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            {summaryMetrics.minPair ? (
              <>
                <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                  {summaryMetrics.minPair.tA} × {summaryMetrics.minPair.tB}
                </div>
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300 block mt-0.5">
                  R = {summaryMetrics.minPair.r > 0 ? `+${summaryMetrics.minPair.r.toFixed(2)}` : summaryMetrics.minPair.r.toFixed(2)} (Lowest Co-movement)
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-400 mt-1 block">N/A</span>
            )}
          </div>

          {/* Highest Risk / Co-Moving Pair Card */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Max Systemic Risk Pair</span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            </div>
            {summaryMetrics.maxPair ? (
              <>
                <div className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 truncate">
                  {summaryMetrics.maxPair.tA} × {summaryMetrics.maxPair.tB}
                </div>
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300 block mt-0.5">
                  R = +{summaryMetrics.maxPair.r.toFixed(2)} (Highest Co-movement)
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-400 mt-1 block">N/A</span>
            )}
          </div>
        </div>

        {/* Toolbar: Sort Algorithm, Filter Highlight, Color Scheme, and Value Toggle */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Sort Mode */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Order:</span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 rounded border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setSortBy('weight')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                    sortBy === 'weight'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Portfolio Weight
                </button>
                <button
                  onClick={() => setSortBy('cluster')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                    sortBy === 'cluster'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                  title="Group correlated assets together using nearest-neighbor similarity clustering"
                >
                  Cluster Similar
                </button>
                <button
                  onClick={() => setSortBy('alphabetical')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                    sortBy === 'alphabetical'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  A-Z
                </button>
              </div>
            </div>

            {/* Filter Highlight Mode */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Highlight:</span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 rounded border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  All Pairs
                </button>
                <button
                  onClick={() => setFilterMode('high_risk')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                    filterMode === 'high_risk'
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                  title="Highlight pairs with R >= 0.70"
                >
                  High Risk (≥ 0.70)
                </button>
                <button
                  onClick={() => setFilterMode('diversifiers')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                    filterMode === 'diversifiers'
                      ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                  title="Highlight pairs with R < 0.30"
                >
                  Diversifiers (&lt; 0.30)
                </button>
                {summaryMetrics.hedgingPairsCount > 0 && (
                  <button
                    onClick={() => setFilterMode('hedges')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                      filterMode === 'hedges'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                    title="Highlight negative correlation (hedging)"
                  >
                    Hedging (R &lt; 0)
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Palette Switcher */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Palette:</span>
              <select
                value={colorScheme}
                onChange={(e) => setColorScheme(e.target.value as ColorScheme)}
                className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 text-slate-700 dark:text-slate-300 font-medium text-xs cursor-pointer focus:outline-none"
              >
                <option value="risk">Risk & Diversification</option>
                <option value="cool">Cool Indigo / Spectral</option>
                <option value="bipolar">Classic Bipolar (Green-Red)</option>
              </select>
            </div>

            {/* Numbers Toggle */}
            <button
              onClick={() => setShowValues(!showValues)}
              className={`px-2 py-0.5 rounded border transition-colors cursor-pointer font-medium ${
                showValues
                  ? 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                  : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              Numbers: {showValues ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Heatmap D3 Container */}
        <div className="relative overflow-x-auto pt-2 pb-1 flex justify-center">
          <svg ref={svgRef} className="select-none transition-all duration-200" />

          {/* Floating Tooltip HUD */}
          {hoveredCell && (
            <div
              className="absolute pointer-events-none z-30 px-3.5 py-2.5 rounded-lg bg-slate-950/95 text-white border border-slate-700 shadow-xl backdrop-blur-md text-xs font-sans max-w-xs transition-opacity duration-100"
              style={{
                left: `${Math.min(containerWidth - 240, Math.max(16, hoveredCell.x + 14))}px`,
                top: `${Math.max(10, hoveredCell.y - 85)}px`
              }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
                <span className="font-mono font-bold text-cyan-400 text-sm">
                  {hoveredCell.rowTicker} × {hoveredCell.colTicker}
                </span>
                <span
                  className="font-mono font-bold px-1.5 py-0.5 rounded text-[11px]"
                  style={{
                    backgroundColor: getColor(hoveredCell.value, hoveredCell.rowIdx === hoveredCell.colIdx),
                    color: getCellTextColor(hoveredCell.value, hoveredCell.rowIdx === hoveredCell.colIdx)
                  }}
                >
                  {hoveredCell.rowIdx === hoveredCell.colIdx ? 'Identity (1.00)' : `R = ${hoveredCell.value > 0 ? `+${hoveredCell.value.toFixed(2)}` : hoveredCell.value.toFixed(2)}`}
                </span>
              </div>

              {hoveredCell.rowIdx === hoveredCell.colIdx ? (
                <div className="text-[11px] text-slate-300">
                  Self-correlation diagonal identity. Asset weight:{' '}
                  <strong className="text-white">{hoveredCell.rowWeight ?? 0}%</strong> of portfolio.
                </div>
              ) : (
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>{hoveredCell.rowTicker}:</span>
                    <span className="text-slate-200 font-mono font-semibold">{hoveredCell.rowWeight ?? 0}% of portfolio</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>{hoveredCell.colTicker}:</span>
                    <span className="text-slate-200 font-mono font-semibold">{hoveredCell.colWeight ?? 0}% of portfolio</span>
                  </div>

                  <div className="pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Diversification Impact: </span>
                    <strong className={
                      hoveredCell.value < 0
                        ? 'text-emerald-400'
                        : hoveredCell.value < 0.35
                        ? 'text-cyan-400'
                        : hoveredCell.value < 0.70
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }>
                      {hoveredCell.value < 0
                        ? 'Inverse / Strong Hedge (Reduces Drawdown)'
                        : hoveredCell.value < 0.35
                        ? 'Optimal Diversifier (Low Co-movement)'
                        : hoveredCell.value < 0.70
                        ? 'Moderate Correlation (Standard Market Beta)'
                        : 'High Concentration Risk (Co-moves in Sell-offs)'}
                    </strong>
                  </div>

                  <div className="text-[10px] text-slate-400 italic pt-0.5">
                    Click cell to inspect {hoveredCell.rowTicker}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Pair Detail Card (if clicked) */}
        {selectedPair && selectedPair.rowIdx !== selectedPair.colIdx && (
          <div className="p-3.5 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {selectedPair.rowTicker} ({selectedPair.rowName || selectedPair.rowTicker})
                </span>
                <span className="text-slate-400">and</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {selectedPair.colTicker} ({selectedPair.colName || selectedPair.colTicker})
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Combined allocation:{' '}
                <strong>{((selectedPair.rowWeight || 0) + (selectedPair.colWeight || 0)).toFixed(1)}%</strong> of portfolio.
                Pairwise correlation R = <strong>{selectedPair.value > 0 ? `+${selectedPair.value.toFixed(2)}` : selectedPair.value.toFixed(2)}</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectTicker?.(selectedPair.rowTicker)}
                className="px-3 py-1.5 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>View {selectedPair.rowTicker}</span>
                <ExternalLink className="w-3 h-3 text-cyan-500" />
              </button>
              <button
                onClick={() => onSelectTicker?.(selectedPair.colTicker)}
                className="px-3 py-1.5 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>View {selectedPair.colTicker}</span>
                <ExternalLink className="w-3 h-3 text-cyan-500" />
              </button>
              <button
                onClick={() => setSelectedPair(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[11px] px-2 py-1 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Quant Interpretive Footnote */}
        <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800">
          <Info className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" />
          <span>
            <strong>Modern Portfolio Theory Insight:</strong> Correlation coefficients closer to -1.0 or 0.0 reduce overall portfolio standard deviation (volatility) without sacrificing expected returns. Clustering assets with high mutual correlation reveals implicit sector over-concentration.
          </span>
        </div>
      </div>
    </div>
  );
};
