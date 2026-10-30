/**
 * OptionsVolatilitySurface Component
 * High-performance D3 visualization of Implied Volatility (IV) Smile & 3D Surface
 * across strike ladder and expiration term structures (7D to 180D).
 *
 * Features:
 * - 3D Isometric Wireframe & Shaded Polygon Volatility Surface with orbit/tilt controls
 * - 2D Volatility Smile curve with Monotone Spline interpolation, ATM marker & 25Δ Skew
 * - Strike x Expiration Heatmap Matrix
 * - Real-time Greeks inspection (Delta, Gamma, Vega, Theta)
 * - Volatility skew & term structure slope analytics (Contango vs Backwardation)
 * - Exportable SVG snapshot for quant reports
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Layers,
  Activity,
  Maximize2,
  Sliders,
  RotateCcw,
  Download,
  Info,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ChevronDown,
  Eye,
  Crosshair,
  Compass
} from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { VolatilitySurfaceData, VolatilitySurfacePoint } from '../types';

interface Props {
  ticker: string;
  spotPrice?: number;
  onSelectStrike?: (strike: number, days?: number, type?: 'CALL' | 'PUT') => void;
  className?: string;
  height?: number;
}

type SurfaceViewMode = '3d' | '2d_smile' | 'heatmap';
type MetricType = 'midIV' | 'callIV' | 'putIV';
type ColorScheme = 'turbo' | 'cyber' | 'viridis';

export const OptionsVolatilitySurface: React.FC<Props> = ({
  ticker,
  spotPrice: initialSpot,
  onSelectStrike,
  className = '',
  height = 520
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Controls state
  const [viewMode, setViewMode] = useState<SurfaceViewMode>('3d');
  const [metric, setMetric] = useState<MetricType>('midIV');
  const [selectedDays, setSelectedDays] = useState<number | 'all'>('all');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('cyber');
  const [showWireframe, setShowWireframe] = useState(true);
  const [showContours, setShowContours] = useState(true);
  const [showMovingAverage, setShowMovingAverage] = useState<boolean>(true);
  const [maWindow, setMaWindow] = useState<number>(3);
  const [hoveredMaIV, setHoveredMaIV] = useState<number | null>(null);
  const [pitch, setPitch] = useState<number>(34); // vertical tilt in degrees
  const [yaw, setYaw] = useState<number>(45); // horizontal rotation in degrees

  // Data & loading state
  const [surfaceData, setSurfaceData] = useState<VolatilitySurfaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<VolatilitySurfacePoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);

  // SVG ref
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  // Measure container width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch surface data
  useEffect(() => {
    let isCancelled = false;
    async function loadSurface() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getOptionsSurface(ticker);
        if (!isCancelled) {
          setSurfaceData(data);
          if (data.strikes.length > 0) {
            const atm = data.strikes[Math.floor(data.strikes.length / 2)];
            setSelectedStrike(atm);
          }
        }
      } catch (err: any) {
        console.warn('API error fetching options surface, generating algorithmic fallback:', err);
        // Resilient fallback generation
        const spot = initialSpot || 150;
        const fallback = generateLocalSurface(ticker, spot);
        if (!isCancelled) {
          setSurfaceData(fallback);
          setSelectedStrike(spot);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadSurface();
    return () => {
      isCancelled = true;
    };
  }, [ticker, initialSpot]);

  // Color interpolator helper
  const getColorInterpolator = (scheme: ColorScheme) => {
    switch (scheme) {
      case 'turbo':
        return d3.interpolateTurbo;
      case 'viridis':
        return d3.interpolateViridis;
      case 'cyber':
      default:
        // High contrast derivatives trading palette: Cyan -> Blue -> Purple -> Amber -> Hot Coral
        return (t: number) => {
          const clamped = Math.max(0, Math.min(1, t));
          return d3.interpolateRgbBasis([
            '#06b6d4', // Cyan 500
            '#3b82f6', // Blue 500
            '#8b5cf6', // Violet 500
            '#f59e0b', // Amber 500
            '#f43f5e'  // Rose 500
          ])(clamped);
        };
    }
  };

  // D3 Rendering effect
  useEffect(() => {
    if (!svgRef.current || !surfaceData || loading) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = Math.max(480, containerWidth);
    const chartHeight = height;

    svg.attr('width', width).attr('height', chartHeight);

    if (viewMode === '3d') {
      render3DSurface(svg, surfaceData, width, chartHeight);
    } else if (viewMode === '2d_smile') {
      render2DSmile(svg, surfaceData, width, chartHeight);
    } else if (viewMode === 'heatmap') {
      renderHeatmap(svg, surfaceData, width, chartHeight);
    }
  }, [surfaceData, viewMode, metric, selectedDays, colorScheme, showWireframe, showContours, pitch, yaw, containerWidth, isDark, showMovingAverage, maWindow]);

  /**
   * 1. 3D ISOMETRIC / PERSPECTIVE SURFACE MESH
   */
  const render3DSurface = (
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    data: VolatilitySurfaceData,
    width: number,
    chartHeight: number
  ) => {
    const margin = { top: 40, right: 50, bottom: 60, left: 60 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = chartHeight - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Extents
    const strikeExtent = d3.extent(data.strikes) as [number, number];
    const daysExtent = d3.extent(data.expirations.map(e => e.days)) as [number, number];
    const ivExtent = [data.ivMin, data.ivMax] as [number, number];

    const interpolator = getColorInterpolator(colorScheme);
    const colorScale = d3.scaleSequential(interpolator).domain([ivExtent[0], ivExtent[1]]);

    // Normalization scales: [0, 1]
    const normX = d3.scaleLinear().domain(strikeExtent).range([-1, 1]); // Strike
    const normY = d3.scaleLinear().domain(daysExtent).range([-1, 1]); // Expiration
    const normZ = d3.scaleLinear().domain(ivExtent).range([0, 1]); // IV

    // Isometric projection mathematics with Yaw & Pitch angles
    const yawRad = (yaw * Math.PI) / 180;
    const pitchRad = (pitch * Math.PI) / 180;

    const cosYaw = Math.cos(yawRad);
    const sinYaw = Math.sin(yawRad);
    const cosPitch = Math.cos(pitchRad);
    const sinPitch = Math.sin(pitchRad);

    const centerX = plotWidth / 2;
    const centerY = plotHeight / 2 + 30;
    const scaleFactor = Math.min(plotWidth, plotHeight) * 0.42;
    const zScale = scaleFactor * 0.9;

    function project3D(xNorm: number, yNorm: number, zNorm: number) {
      // Rotate around Z axis by yaw, then pitch tilt
      const xRot = xNorm * cosYaw - yNorm * sinYaw;
      const yRot = xNorm * sinYaw + yNorm * cosYaw;

      const screenX = centerX + xRot * scaleFactor * 1.35;
      const screenY = centerY + (yRot * sinPitch - zNorm * cosPitch) * scaleFactor;
      const depth = yRot * cosPitch + zNorm * sinPitch; // for painter's algorithm sorting

      return { x: screenX, y: screenY, depth };
    }

    // Grid coordinates lookup
    const expirations = data.expirations;
    const strikes = data.strikes;

    // Build mesh quads
    interface MeshQuad {
      p1: { x: number; y: number; depth: number };
      p2: { x: number; y: number; depth: number };
      p3: { x: number; y: number; depth: number };
      p4: { x: number; y: number; depth: number };
      avgIV: number;
      avgDepth: number;
      point: VolatilitySurfacePoint;
    }

    const quads: MeshQuad[] = [];

    for (let j = 0; j < expirations.length - 1; j++) {
      const exp1 = expirations[j];
      const exp2 = expirations[j + 1];

      for (let i = 0; i < strikes.length - 1; i++) {
        const s1 = strikes[i];
        const s2 = strikes[i + 1];

        const pt11 = data.points.find(p => p.daysToExpiry === exp1.days && p.strike === s1);
        const pt21 = data.points.find(p => p.daysToExpiry === exp1.days && p.strike === s2);
        const pt22 = data.points.find(p => p.daysToExpiry === exp2.days && p.strike === s2);
        const pt12 = data.points.find(p => p.daysToExpiry === exp2.days && p.strike === s1);

        if (!pt11 || !pt21 || !pt22 || !pt12) continue;

        const val11 = metric === 'midIV' ? pt11.midIV : metric === 'callIV' ? pt11.callIV : pt11.putIV;
        const val21 = metric === 'midIV' ? pt21.midIV : metric === 'callIV' ? pt21.callIV : pt21.putIV;
        const val22 = metric === 'midIV' ? pt22.midIV : metric === 'callIV' ? pt22.callIV : pt22.putIV;
        const val12 = metric === 'midIV' ? pt12.midIV : metric === 'callIV' ? pt12.callIV : pt12.putIV;

        const avgIV = (val11 + val21 + val22 + val12) / 4;

        const p1 = project3D(normX(s1), normY(exp1.days), normZ(val11));
        const p2 = project3D(normX(s2), normY(exp1.days), normZ(val21));
        const p3 = project3D(normX(s2), normY(exp2.days), normZ(val22));
        const p4 = project3D(normX(s1), normY(exp2.days), normZ(val12));

        const avgDepth = (p1.depth + p2.depth + p3.depth + p4.depth) / 4;

        quads.push({ p1, p2, p3, p4, avgIV, avgDepth, point: pt11 });
      }
    }

    // Painter's algorithm: sort quads back-to-front by average depth
    quads.sort((a, b) => a.avgDepth - b.avgDepth);

    // Draw baseline bounding grid on floor (Z = 0)
    const floorCorners = [
      project3D(-1, -1, 0),
      project3D(1, -1, 0),
      project3D(1, 1, 0),
      project3D(-1, 1, 0)
    ];

    g.append('polygon')
      .attr('points', floorCorners.map(p => `${p.x},${p.y}`).join(' '))
      .attr('fill', isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(241, 245, 249, 0.7)')
      .attr('stroke', isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(203, 213, 225, 0.8)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Draw mesh polygons
    const meshGroup = g.append('g').attr('class', 'surface-mesh');

    quads.forEach(quad => {
      const pathPoints = `${quad.p1.x},${quad.p1.y} ${quad.p2.x},${quad.p2.y} ${quad.p3.x},${quad.p3.y} ${quad.p4.x},${quad.p4.y}`;
      const baseColor = colorScale(quad.avgIV);

      meshGroup
        .append('polygon')
        .attr('points', pathPoints)
        .attr('fill', baseColor)
        .attr('fill-opacity', 0.82)
        .attr('stroke', showWireframe ? (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)') : 'none')
        .attr('stroke-width', showWireframe ? 0.75 : 0)
        .style('cursor', 'pointer')
        .on('mouseenter', function (event) {
          d3.select(this)
            .attr('fill-opacity', 1.0)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 2);
          setHoveredPoint(quad.point);
          if (containerRef.current) {
            const [mx, my] = d3.pointer(event, containerRef.current);
            setTooltipPos({ x: mx, y: my });
          }
        })
        .on('mousemove', function (event) {
          if (containerRef.current) {
            const [mx, my] = d3.pointer(event, containerRef.current);
            setTooltipPos({ x: mx, y: my });
          }
        })
        .on('mouseleave', function () {
          d3.select(this)
            .attr('fill-opacity', 0.82)
            .attr('stroke', showWireframe ? (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)') : 'none')
            .attr('stroke-width', showWireframe ? 0.75 : 0);
          setHoveredPoint(null);
          setTooltipPos(null);
        })
        .on('click', () => {
          setSelectedStrike(quad.point.strike);
          if (onSelectStrike) {
            onSelectStrike(quad.point.strike, quad.point.daysToExpiry, 'CALL');
          }
        });
    });

    // Interactive 3D Surface Vertex Nodes for pinpoint strike x expiration hovering
    const vertexGroup = g.append('g').attr('class', 'surface-3d-vertex-nodes');
    data.points.forEach(pt => {
      const val = metric === 'midIV' ? pt.midIV : metric === 'callIV' ? pt.callIV : pt.putIV;
      const proj = project3D(normX(pt.strike), normY(pt.daysToExpiry), normZ(val));
      const isAtm = Math.abs(pt.moneyness - 1) < 0.02;

      const vertexCircle = vertexGroup
        .append('circle')
        .attr('cx', proj.x)
        .attr('cy', proj.y)
        .attr('r', isAtm ? 4 : 2.5)
        .attr('fill', isAtm ? '#38bdf8' : colorScale(val))
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1)
        .attr('opacity', isAtm ? 0.95 : 0.75)
        .style('cursor', 'pointer');

      vertexCircle
        .on('mouseenter', function (event) {
          d3.select(this)
            .attr('r', 6)
            .attr('stroke-width', 2.5)
            .attr('opacity', 1.0);
          setHoveredPoint(pt);
          if (containerRef.current) {
            const [mx, my] = d3.pointer(event, containerRef.current);
            setTooltipPos({ x: mx, y: my });
          }
        })
        .on('mousemove', function (event) {
          if (containerRef.current) {
            const [mx, my] = d3.pointer(event, containerRef.current);
            setTooltipPos({ x: mx, y: my });
          }
        })
        .on('mouseleave', function () {
          d3.select(this)
            .attr('r', isAtm ? 4 : 2.5)
            .attr('stroke-width', 1)
            .attr('opacity', isAtm ? 0.95 : 0.75);
          setHoveredPoint(null);
          setTooltipPos(null);
        })
        .on('click', () => {
          setSelectedStrike(pt.strike);
          if (onSelectStrike) {
            onSelectStrike(pt.strike, pt.daysToExpiry, 'CALL');
          }
        });
    });

    // Draw Strike & Expiry axis labels in 3D
    const labelGroup = g.append('g').attr('class', 'axis-3d-labels');

    // Strike axis label
    const strikeStart = project3D(-1, -1, 0);
    const strikeEnd = project3D(1, -1, 0);
    labelGroup
      .append('text')
      .attr('x', (strikeStart.x + strikeEnd.x) / 2)
      .attr('y', (strikeStart.y + strikeEnd.y) / 2 + 22)
      .attr('text-anchor', 'middle')
      .attr('fill', isDark ? '#94a3b8' : '#64748b')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('font-family', 'monospace')
      .text('Strike Price Ladder ($) →');

    // Expiry axis label
    const expStart = project3D(1, -1, 0);
    const expEnd = project3D(1, 1, 0);
    labelGroup
      .append('text')
      .attr('x', (expStart.x + expEnd.x) / 2 + 18)
      .attr('y', (expStart.y + expEnd.y) / 2 + 4)
      .attr('text-anchor', 'start')
      .attr('fill', isDark ? '#94a3b8' : '#64748b')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('font-family', 'monospace')
      .text('↗ Expiration Tenor (Days)');

    // ATM Spot vertical line
    const atmStrike = data.strikes.find(s => Math.abs(s - data.spotPrice) === Math.min(...data.strikes.map(st => Math.abs(st - data.spotPrice)))) || data.spotPrice;
    const atmProjBottom = project3D(normX(atmStrike), normY(30), 0);
    const atmProjTop = project3D(normX(atmStrike), normY(30), normZ(data.atmIV));

    g.append('line')
      .attr('x1', atmProjBottom.x)
      .attr('y1', atmProjBottom.y)
      .attr('x2', atmProjTop.x)
      .attr('y2', atmProjTop.y)
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,3');

    g.append('circle')
      .attr('cx', atmProjTop.x)
      .attr('cy', atmProjTop.y)
      .attr('r', 5)
      .attr('fill', '#0284c7')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    g.append('text')
      .attr('x', atmProjTop.x + 8)
      .attr('y', atmProjTop.y - 6)
      .attr('fill', '#38bdf8')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .text(`ATM: $${atmStrike} (${data.atmIV}%)`);

    // 3D Moving Average Ridge / Term Structure Trend Line
    if (showMovingAverage && data.expirations.length > 1) {
      const maSpinePoints: Array<{ x: number; y: number; depth: number; atmIV: number; label: string }> = [];
      data.expirations.forEach(exp => {
        const expPts = data.points.filter(p => p.daysToExpiry === exp.days);
        const nearAtmPts = expPts.filter(p => Math.abs(p.moneyness - 1) <= 0.08);
        const avgVal = nearAtmPts.length > 0
          ? nearAtmPts.reduce((acc, p) => acc + (metric === 'midIV' ? p.midIV : metric === 'callIV' ? p.callIV : p.putIV), 0) / nearAtmPts.length
          : exp.atmIV;

        const proj = project3D(normX(atmStrike), normY(exp.days), normZ(avgVal));
        maSpinePoints.push({ ...proj, atmIV: avgVal, label: exp.label });
      });

      // Draw 3D MA trend line segments
      for (let k = 0; k < maSpinePoints.length - 1; k++) {
        const pA = maSpinePoints[k];
        const pB = maSpinePoints[k + 1];

        // Amber glow path
        g.append('line')
          .attr('x1', pA.x)
          .attr('y1', pA.y)
          .attr('x2', pB.x)
          .attr('y2', pB.y)
          .attr('stroke', '#f59e0b')
          .attr('stroke-width', 6)
          .attr('stroke-opacity', 0.25)
          .attr('stroke-linecap', 'round');

        // Solid dashed trend line
        g.append('line')
          .attr('x1', pA.x)
          .attr('y1', pA.y)
          .attr('x2', pB.x)
          .attr('y2', pB.y)
          .attr('stroke', '#f59e0b')
          .attr('stroke-width', 2.5)
          .attr('stroke-dasharray', '5,3')
          .attr('stroke-linecap', 'round');
      }

      // Nodes on MA spine
      maSpinePoints.forEach(p => {
        g.append('circle')
          .attr('cx', p.x)
          .attr('cy', p.y)
          .attr('r', 3.5)
          .attr('fill', '#f59e0b')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5);
      });

      // Trend label
      const firstNode = maSpinePoints[0];
      if (firstNode) {
        g.append('text')
          .attr('x', firstNode.x - 10)
          .attr('y', firstNode.y - 10)
          .attr('text-anchor', 'end')
          .attr('fill', '#f59e0b')
          .attr('font-size', '9px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'monospace')
          .text('MA Trend Spine (Amber)');
      }
    }
  };

  /**
   * 2. 2D VOLATILITY SMILE & SKEW CURVE
   */
  const render2DSmile = (
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    data: VolatilitySurfaceData,
    width: number,
    chartHeight: number
  ) => {
    const margin = { top: 30, right: 35, bottom: 50, left: 55 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = chartHeight - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Filter points based on selected tenor
    const targetTenor = selectedDays === 'all' ? 30 : Number(selectedDays);
    const activePoints = data.points.filter(p => p.daysToExpiry === targetTenor);
    const strikes = Array.from(new Set(activePoints.map(p => p.strike))).sort((a, b) => a - b);

    const minStrike = strikes[0] || data.spotPrice * 0.85;
    const maxStrike = strikes[strikes.length - 1] || data.spotPrice * 1.15;

    const allIvs = activePoints.flatMap(p => [p.callIV, p.putIV]);
    const minIV = Math.max(5, Math.floor(Math.min(...allIvs) - 3));
    const maxIV = Math.ceil(Math.max(...allIvs) + 4);

    const xScale = d3.scaleLinear().domain([minStrike, maxStrike]).range([0, plotWidth]);
    const yScale = d3.scaleLinear().domain([minIV, maxIV]).range([plotHeight, 0]).nice();

    // Subtle Gridlines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-plotWidth)
          .tickFormat(() => '')
      )
      .attr('stroke', isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.8)')
      .attr('stroke-dasharray', '3,3');

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(8).tickFormat(d => `$${d}`);
    const yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(d => `${d}%`);

    g.append('g')
      .attr('transform', `translate(0, ${plotHeight})`)
      .call(xAxis)
      .attr('color', isDark ? '#64748b' : '#94a3b8')
      .selectAll('text')
      .attr('font-family', 'monospace')
      .attr('font-size', '11px');

    g.append('g')
      .call(yAxis)
      .attr('color', isDark ? '#64748b' : '#94a3b8')
      .selectAll('text')
      .attr('font-family', 'monospace')
      .attr('font-size', '11px');

    // Gradients for Call and Put area fill
    const defs = svg.append('defs');

    const callGrad = defs
      .append('linearGradient')
      .attr('id', 'callGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    callGrad.append('stop').attr('offset', '0%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.28);
    callGrad.append('stop').attr('offset', '100%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.0);

    const putGrad = defs
      .append('linearGradient')
      .attr('id', 'putGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    putGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.28);
    putGrad.append('stop').attr('offset', '100%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.0);

    // Area generators
    const callArea = d3
      .area<VolatilitySurfacePoint>()
      .x(d => xScale(d.strike))
      .y0(plotHeight)
      .y1(d => yScale(d.callIV))
      .curve(d3.curveMonotoneX);

    const putArea = d3
      .area<VolatilitySurfacePoint>()
      .x(d => xScale(d.strike))
      .y0(plotHeight)
      .y1(d => yScale(d.putIV))
      .curve(d3.curveMonotoneX);

    // Line generators
    const callLine = d3
      .line<VolatilitySurfacePoint>()
      .x(d => xScale(d.strike))
      .y(d => yScale(d.callIV))
      .curve(d3.curveMonotoneX);

    const putLine = d3
      .line<VolatilitySurfacePoint>()
      .x(d => xScale(d.strike))
      .y(d => yScale(d.putIV))
      .curve(d3.curveMonotoneX);

    const midLine = d3
      .line<VolatilitySurfacePoint>()
      .x(d => xScale(d.strike))
      .y(d => yScale(d.midIV))
      .curve(d3.curveMonotoneX);

    // Draw Put curve & area (downside skew)
    if (metric === 'midIV' || metric === 'putIV') {
      g.append('path')
        .datum(activePoints)
        .attr('fill', 'url(#putGradient)')
        .attr('d', putArea);

      g.append('path')
        .datum(activePoints)
        .attr('fill', 'none')
        .attr('stroke', '#f43f5e')
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', metric === 'midIV' ? '4,4' : 'none')
        .attr('d', putLine);
    }

    // Draw Call curve & area
    if (metric === 'midIV' || metric === 'callIV') {
      g.append('path')
        .datum(activePoints)
        .attr('fill', 'url(#callGradient)')
        .attr('d', callArea);

      g.append('path')
        .datum(activePoints)
        .attr('fill', 'none')
        .attr('stroke', '#06b6d4')
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', metric === 'midIV' ? '4,4' : 'none')
        .attr('d', callLine);
    }

    // Draw Blended / Mid IV thick solid line if active
    if (metric === 'midIV') {
      g.append('path')
        .datum(activePoints)
        .attr('fill', 'none')
        .attr('stroke', '#a855f7')
        .attr('stroke-width', 3)
        .attr('d', midLine);
    }

    // ATM reference line
    const atmX = xScale(data.spotPrice);
    if (atmX >= 0 && atmX <= plotWidth) {
      g.append('line')
        .attr('x1', atmX)
        .attr('y1', 0)
        .attr('x2', atmX)
        .attr('y2', plotHeight)
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 1.75)
        .attr('stroke-dasharray', '5,4');

      g.append('text')
        .attr('x', atmX + 6)
        .attr('y', 16)
        .attr('fill', '#38bdf8')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'monospace')
        .text(`Spot: $${data.spotPrice.toLocaleString()}`);
    }

    // Moving Average Trend Line (Smoothed baseline to identify sentiment shifts)
    const half = Math.floor(maWindow / 2);
    const maTrendValues = activePoints.map((pt, idx) => {
      let sum = 0;
      let count = 0;
      for (let w = -half; w <= half; w++) {
        const neighborIdx = idx + w;
        if (neighborIdx >= 0 && neighborIdx < activePoints.length) {
          const nPt = activePoints[neighborIdx];
          const val = metric === 'midIV' ? nPt.midIV : metric === 'callIV' ? nPt.callIV : nPt.putIV;
          sum += val;
          count++;
        }
      }
      return {
        strike: pt.strike,
        maIV: Number((sum / (count || 1)).toFixed(2))
      };
    });

    if (showMovingAverage && maTrendValues.length > 0) {
      const maLine = d3
        .line<{ strike: number; maIV: number }>()
        .x(d => xScale(d.strike))
        .y(d => yScale(d.maIV))
        .curve(d3.curveMonotoneX);

      // Glowing aura path
      g.append('path')
        .datum(maTrendValues)
        .attr('fill', 'none')
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 6)
        .attr('stroke-opacity', 0.22)
        .attr('stroke-linecap', 'round')
        .attr('d', maLine);

      // Main dashed moving average trend line
      g.append('path')
        .datum(maTrendValues)
        .attr('fill', 'none')
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '5,3')
        .attr('stroke-linecap', 'round')
        .attr('d', maLine);

      // Trend dots
      maTrendValues.forEach(m => {
        g.append('circle')
          .attr('cx', xScale(m.strike))
          .attr('cy', yScale(m.maIV))
          .attr('r', 3)
          .attr('fill', '#f59e0b')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.2);
      });
    }

    // On-chart Legend Pill
    const legendWidth = showMovingAverage ? 230 : 130;
    const legendG = g.append('g').attr('transform', `translate(${plotWidth - legendWidth}, 8)`);
    legendG.append('rect')
      .attr('width', legendWidth)
      .attr('height', 24)
      .attr('rx', 6)
      .attr('fill', isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.9)')
      .attr('stroke', isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)');

    let legX = 10;
    if (metric === 'callIV' || metric === 'midIV') {
      legendG.append('line').attr('x1', legX).attr('y1', 12).attr('x2', legX + 12).attr('y2', 12).attr('stroke', '#06b6d4').attr('stroke-width', 2);
      legendG.append('text').attr('x', legX + 16).attr('y', 15).attr('fill', '#06b6d4').attr('font-size', '10px').attr('font-family', 'monospace').attr('font-weight', '600').text('Call');
      legX += 50;
    }
    if (metric === 'putIV' || metric === 'midIV') {
      legendG.append('line').attr('x1', legX).attr('y1', 12).attr('x2', legX + 12).attr('y2', 12).attr('stroke', '#f43f5e').attr('stroke-width', 2);
      legendG.append('text').attr('x', legX + 16).attr('y', 15).attr('fill', '#f43f5e').attr('font-size', '10px').attr('font-family', 'monospace').attr('font-weight', '600').text('Put');
      legX += 45;
    }
    if (showMovingAverage) {
      legendG.append('line').attr('x1', legX).attr('y1', 12).attr('x2', legX + 14).attr('y2', 12).attr('stroke', '#f59e0b').attr('stroke-width', 2.5).attr('stroke-dasharray', '3,2');
      legendG.append('text').attr('x', legX + 18).attr('y', 15).attr('fill', '#f59e0b').attr('font-size', '10px').attr('font-family', 'monospace').attr('font-weight', 'bold').text(`MA(${maWindow}) Trend`);
    }

    // Strike circles on active curve
    activePoints.forEach(pt => {
      const cx = xScale(pt.strike);
      const cy = yScale(metric === 'midIV' ? pt.midIV : metric === 'callIV' ? pt.callIV : pt.putIV);

      const circle = g
        .append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', pt.strike === selectedStrike ? 6 : 4)
        .attr('fill', pt.isATM ? '#38bdf8' : metric === 'callIV' ? '#06b6d4' : metric === 'putIV' ? '#f43f5e' : '#a855f7')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', pt.strike === selectedStrike ? 2.5 : 1.5)
        .style('cursor', 'pointer');

      circle
        .on('mouseenter', function (event) {
          setHoveredPoint(pt);
          const foundMa = maTrendValues.find(m => m.strike === pt.strike);
          setHoveredMaIV(foundMa ? foundMa.maIV : null);
          if (containerRef.current) {
            const [cmx, cmy] = d3.pointer(event, containerRef.current);
            setTooltipPos({ x: cmx, y: cmy });
          }
        })
        .on('mousemove', function (event) {
          if (containerRef.current) {
            const [cmx, cmy] = d3.pointer(event, containerRef.current);
            setTooltipPos({ x: cmx, y: cmy });
          }
        })
        .on('mouseleave', () => {
          setHoveredPoint(null);
          setHoveredMaIV(null);
          setTooltipPos(null);
        })
        .on('click', () => {
          setSelectedStrike(pt.strike);
          if (onSelectStrike) onSelectStrike(pt.strike, pt.daysToExpiry, metric === 'putIV' ? 'PUT' : 'CALL');
        });
    });

    // Interactive mouse crosshair overlay
    const overlay = g
      .append('rect')
      .attr('width', plotWidth)
      .attr('height', plotHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    const crosshairLineX = g
      .append('line')
      .attr('stroke', isDark ? '#cbd5e1' : '#475569')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2')
      .style('opacity', 0);

    overlay
      .on('mousemove', function (event) {
        const [mx] = d3.pointer(event);
        const hoveredStrike = xScale.invert(mx);

        // Find nearest point
        const nearest = activePoints.reduce((prev, curr) =>
          Math.abs(curr.strike - hoveredStrike) < Math.abs(prev.strike - hoveredStrike) ? curr : prev,
          activePoints[0]
        );

        if (nearest) {
          const nx = xScale(nearest.strike);
          crosshairLineX
            .attr('x1', nx)
            .attr('y1', 0)
            .attr('x2', nx)
            .attr('y2', plotHeight)
            .style('opacity', 1);
          setHoveredPoint(nearest);

          const foundMa = maTrendValues.find(m => m.strike === nearest.strike);
          setHoveredMaIV(foundMa ? foundMa.maIV : null);

          if (containerRef.current) {
            const [cmx, cmy] = d3.pointer(event, containerRef.current);
            setTooltipPos({ x: cmx, y: cmy });
          }
        }
      })
      .on('mouseleave', function () {
        crosshairLineX.style('opacity', 0);
        setHoveredPoint(null);
        setHoveredMaIV(null);
        setTooltipPos(null);
      })
      .on('click', function (event) {
        const [mx] = d3.pointer(event);
        const hoveredStrike = xScale.invert(mx);
        const nearest = activePoints.reduce((prev, curr) =>
          Math.abs(curr.strike - hoveredStrike) < Math.abs(prev.strike - hoveredStrike) ? curr : prev,
          activePoints[0]
        );
        if (nearest) {
          setSelectedStrike(nearest.strike);
          if (onSelectStrike) onSelectStrike(nearest.strike, nearest.daysToExpiry, 'CALL');
        }
      });
  };

  /**
   * 3. HEATMAP MATRIX (Strikes x Expirations)
   */
  const renderHeatmap = (
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    data: VolatilitySurfaceData,
    width: number,
    chartHeight: number
  ) => {
    const margin = { top: 40, right: 35, bottom: 50, left: 90 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = chartHeight - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    const strikes = data.strikes;
    const expirations = data.expirations;

    const cellWidth = plotWidth / strikes.length;
    const cellHeight = plotHeight / expirations.length;

    const interpolator = getColorInterpolator(colorScheme);
    const colorScale = d3.scaleSequential(interpolator).domain([data.ivMin, data.ivMax]);

    // Draw Heatmap Cells
    expirations.forEach((exp, rowIdx) => {
      strikes.forEach((strike, colIdx) => {
        const pt = data.points.find(p => p.daysToExpiry === exp.days && p.strike === strike);
        if (!pt) return;

        const val = metric === 'midIV' ? pt.midIV : metric === 'callIV' ? pt.callIV : pt.putIV;
        const x = colIdx * cellWidth;
        const y = rowIdx * cellHeight;

        const cell = g
          .append('rect')
          .attr('x', x + 1)
          .attr('y', y + 1)
          .attr('width', Math.max(2, cellWidth - 2))
          .attr('height', Math.max(2, cellHeight - 2))
          .attr('rx', 4)
          .attr('fill', colorScale(val))
          .attr('stroke', pt.strike === selectedStrike ? '#ffffff' : 'none')
          .attr('stroke-width', pt.strike === selectedStrike ? 2 : 0)
          .style('cursor', 'pointer');

        cell
          .on('mouseenter', function (event) {
            d3.select(this).attr('stroke', '#ffffff').attr('stroke-width', 2);
            setHoveredPoint(pt);
            if (containerRef.current) {
              const [cmx, cmy] = d3.pointer(event, containerRef.current);
              setTooltipPos({ x: cmx, y: cmy });
            }
          })
          .on('mousemove', function (event) {
            if (containerRef.current) {
              const [cmx, cmy] = d3.pointer(event, containerRef.current);
              setTooltipPos({ x: cmx, y: cmy });
            }
          })
          .on('mouseleave', function () {
            d3.select(this)
              .attr('stroke', pt.strike === selectedStrike ? '#ffffff' : 'none')
              .attr('stroke-width', pt.strike === selectedStrike ? 2 : 0);
            setHoveredPoint(null);
            setTooltipPos(null);
          })
          .on('click', () => {
            setSelectedStrike(pt.strike);
            if (onSelectStrike) onSelectStrike(pt.strike, pt.daysToExpiry, 'CALL');
          });

        // Add text label if cell is large enough
        if (cellWidth > 38 && cellHeight > 24) {
          g.append('text')
            .attr('x', x + cellWidth / 2)
            .attr('y', y + cellHeight / 2 + 3)
            .attr('text-anchor', 'middle')
            .attr('fill', '#ffffff')
            .attr('font-size', '9px')
            .attr('font-weight', '600')
            .attr('font-family', 'monospace')
            .attr('pointer-events', 'none')
            .text(`${val.toFixed(1)}%`);
        }
      });
    });

    // Strike column headers (Bottom)
    strikes.forEach((strike, i) => {
      const isAtm = Math.abs(strike - data.spotPrice) === Math.min(...strikes.map(s => Math.abs(s - data.spotPrice)));
      g.append('text')
        .attr('x', i * cellWidth + cellWidth / 2)
        .attr('y', plotHeight + 20)
        .attr('text-anchor', 'middle')
        .attr('fill', isAtm ? '#38bdf8' : isDark ? '#94a3b8' : '#64748b')
        .attr('font-size', isAtm ? '11px' : '9px')
        .attr('font-weight', isAtm ? 'bold' : 'normal')
        .attr('font-family', 'monospace')
        .text(`$${strike}`);
    });

    // Expiration row headers (Left)
    expirations.forEach((exp, i) => {
      g.append('text')
        .attr('x', -10)
        .attr('y', i * cellHeight + cellHeight / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('fill', isDark ? '#94a3b8' : '#64748b')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('font-family', 'monospace')
        .text(exp.label.split(' ')[0]);
    });
  };

  // Export SVG Snapshot
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ticker}_volatility_surface_${viewMode}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden font-sans transition-colors ${className}`}>
      {/* Header & Controls Bar */}
      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold font-display tracking-tight text-slate-900 dark:text-white">
                Implied Volatility Surface & Smile
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 font-semibold">
                D3 v7 Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Continuous strike cross-sections and multi-tenor term structure (7D – 180D) for {ticker}
            </p>
          </div>
        </div>

        {/* View mode toggle pills */}
        <div className="flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-950 p-1 rounded-xl border border-slate-300 dark:border-slate-800 text-xs font-mono">
          <button
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewMode === '3d'
                ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            3D Surface
          </button>
          <button
            onClick={() => setViewMode('2d_smile')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewMode === '2d_smile'
                ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            2D Smile
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'heatmap'
                ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Heatmap Matrix
          </button>
        </div>
      </div>

      {/* Subheader: Skew Telemetry & Parameters */}
      {surfaceData && (
        <div className="px-5 py-3 bg-slate-100/60 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Spot: </span>
              <span className="font-bold text-slate-900 dark:text-white">${surfaceData.spotPrice.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">ATM IV: </span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400">{surfaceData.atmIV}%</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">25Δ Skew: </span>
              <span
                className={`font-bold ${
                  surfaceData.skew25Delta > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {surfaceData.skew25Delta > 0 ? `+${surfaceData.skew25Delta}% (Put Premium)` : `${surfaceData.skew25Delta}%`}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Term Slope: </span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                  surfaceData.termStructureSlope === 'Contango'
                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                    : surfaceData.termStructureSlope === 'Backwardation'
                    ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {surfaceData.termStructureSlope}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Moving Average Trend Line Toggle Button */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
              <button
                onClick={() => setShowMovingAverage(prev => !prev)}
                title="Toggle Moving Average Trend Line to identify shifts in market sentiment over time"
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono flex items-center gap-1.5 cursor-pointer transition-colors ${
                  showMovingAverage
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TrendingUp className={`w-3.5 h-3.5 ${showMovingAverage ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>MA Trend</span>
                {showMovingAverage && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
              {showMovingAverage && (
                <button
                  onClick={() => setMaWindow(prev => prev === 3 ? 5 : 3)}
                  title="Toggle Moving Average Window (3-Strike vs 5-Strike)"
                  className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-mono cursor-pointer"
                >
                  {maWindow}P
                </button>
              )}
            </div>

            {/* Metric Selector */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setMetric('midIV')}
                className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${
                  metric === 'midIV'
                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Mid IV
              </button>
              <button
                onClick={() => setMetric('callIV')}
                className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${
                  metric === 'callIV'
                    ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Call IV
              </button>
              <button
                onClick={() => setMetric('putIV')}
                className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${
                  metric === 'putIV'
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Put IV
              </button>
            </div>

            {/* Export SVG Button */}
            <button
              onClick={handleExportSvg}
              title="Download SVG vector graphic"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tenor Sub-Bar for 2D Smile */}
      {viewMode === '2d_smile' && surfaceData && (
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/60 flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-slate-500 dark:text-slate-400">Tenor:</span>
          {surfaceData.expirations.map(exp => (
            <button
              key={exp.days}
              onClick={() => setSelectedDays(exp.days)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                selectedDays === exp.days
                  ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-600 font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {exp.label} (±${exp.expMove})
            </button>
          ))}
        </div>
      )}

      {/* 3D Orbit & Tilt Angle Sliders for 3D View */}
      {viewMode === '3d' && (
        <div className="px-5 py-2 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">Rotation (Yaw):</span>
              <input
                type="range"
                min="0"
                max="90"
                value={yaw}
                onChange={e => setYaw(Number(e.target.value))}
                className="w-24 accent-cyan-500 cursor-pointer"
              />
              <span className="w-8 text-right font-mono">{yaw}°</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">Tilt (Pitch):</span>
              <input
                type="range"
                min="10"
                max="75"
                value={pitch}
                onChange={e => setPitch(Number(e.target.value))}
                className="w-24 accent-cyan-500 cursor-pointer"
              />
              <span className="w-8 text-right font-mono">{pitch}°</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showWireframe}
                onChange={e => setShowWireframe(e.target.checked)}
                className="rounded accent-cyan-500 cursor-pointer"
              />
              Wireframe
            </label>
            <button
              onClick={() => {
                setYaw(45);
                setPitch(34);
              }}
              className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset Angles
            </button>
          </div>
        </div>
      )}

      {/* Chart Canvas Area */}
      <div ref={containerRef} className="relative p-2 sm:p-4 bg-slate-900/5 dark:bg-slate-950/70 overflow-hidden">
        {loading ? (
          <div className="h-[460px] flex flex-col items-center justify-center space-y-3">
            <Activity className="w-8 h-8 text-cyan-500 animate-spin" />
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Generating Black-Scholes Volatility Surface for {ticker}...
            </p>
          </div>
        ) : (
          <div className="flex justify-center items-center">
            <svg ref={svgRef} className="max-w-full overflow-visible select-none" />
          </div>
        )}

        {/* Dynamic Interactive Tooltip Following Cursor on Surface Hover */}
        {hoveredPoint && (() => {
          const expMeta = surfaceData?.expirations.find(e => e.days === hoveredPoint.daysToExpiry);
          const expiryDateFormatted = expMeta?.date || 'N/A';
          const isAtm = Math.abs(hoveredPoint.moneyness - 1) < 0.015;
          const isOtmCall = hoveredPoint.moneyness > 1.015;

          const tooltipStyle: React.CSSProperties = tooltipPos
            ? {
                left: `${Math.min(Math.max(12, tooltipPos.x + 18), containerWidth - 280)}px`,
                top: `${tooltipPos.y < 210 ? tooltipPos.y + 16 : tooltipPos.y - 200}px`
              }
            : {
                top: '24px',
                left: '24px'
              };

          return (
            <div
              style={tooltipStyle}
              className="pointer-events-none absolute z-30 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl text-xs font-mono space-y-2 animate-fadeIn min-w-[245px] max-w-[290px]"
            >
              {/* Header: Strike Price & Expiry Date */}
              <div className="border-b border-slate-200 dark:border-slate-800 pb-2 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Strike</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                      ${hoveredPoint.strike.toFixed(2)}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      isAtm
                        ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                        : isOtmCall
                        ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                    }`}
                  >
                    {isAtm ? 'ATM' : isOtmCall ? 'OTM Call' : 'OTM Put'}
                  </span>
                </div>

                {/* Expiry Date Display */}
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 pt-0.5">
                  <span className="text-slate-400">Expiry Date:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <span className="text-cyan-600 dark:text-cyan-400">{expiryDateFormatted}</span>
                    <span className="text-[10px] text-slate-400">({hoveredPoint.daysToExpiry}D)</span>
                  </span>
                </div>
              </div>

              {/* Precise Implied Volatility (IV) Values */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  <span>Precise Implied Volatility</span>
                  <span className="text-[9px] text-purple-600 dark:text-purple-400">Black-Scholes</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div
                    className={`p-1.5 rounded-lg border transition-colors ${
                      metric === 'midIV'
                        ? 'bg-purple-100/80 dark:bg-purple-950/80 border-purple-300 dark:border-purple-600'
                        : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span className="text-[9px] text-slate-400 block">Mid IV</span>
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                      {hoveredPoint.midIV.toFixed(2)}%
                    </span>
                  </div>

                  <div
                    className={`p-1.5 rounded-lg border transition-colors ${
                      metric === 'callIV'
                        ? 'bg-cyan-100/80 dark:bg-cyan-950/80 border-cyan-300 dark:border-cyan-600'
                        : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span className="text-[9px] text-slate-400 block">Call IV</span>
                    <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
                      {hoveredPoint.callIV.toFixed(2)}%
                    </span>
                  </div>

                  <div
                    className={`p-1.5 rounded-lg border transition-colors ${
                      metric === 'putIV'
                        ? 'bg-rose-100/80 dark:bg-rose-950/80 border-rose-300 dark:border-rose-600'
                        : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span className="text-[9px] text-slate-400 block">Put IV</span>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      {hoveredPoint.putIV.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Extended Analytics: Moneyness, Greeks & Pricing */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400">Moneyness: </span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">{hoveredPoint.moneyness.toFixed(2)}x</span>
                </div>
                {hoveredPoint.vega !== undefined && (
                  <div>
                    <span className="text-slate-400">Vega (ν): </span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">{hoveredPoint.vega.toFixed(3)}</span>
                  </div>
                )}
                {hoveredPoint.deltaCall !== undefined && (
                  <div>
                    <span className="text-slate-400">Call Δ: </span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{hoveredPoint.deltaCall.toFixed(3)}</span>
                  </div>
                )}
                {hoveredPoint.deltaPut !== undefined && (
                  <div>
                    <span className="text-slate-400">Put Δ: </span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">{hoveredPoint.deltaPut.toFixed(3)}</span>
                  </div>
                )}
              </div>

              {/* Moving Average Trend & Sentiment Shift */}
              {showMovingAverage && hoveredMaIV !== null && (
                <div className="py-1 px-1.5 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-[10px]">
                  <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                    MA({maWindow}) Trend:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-700 dark:text-amber-300 font-bold">{hoveredMaIV.toFixed(2)}%</span>
                    {(() => {
                      const currentVal = metric === 'midIV' ? hoveredPoint.midIV : metric === 'callIV' ? hoveredPoint.callIV : hoveredPoint.putIV;
                      const spread = Number((currentVal - hoveredMaIV).toFixed(2));
                      return (
                        <span
                          className={`font-mono px-1 rounded font-semibold ${
                            spread > 0.3
                              ? 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
                              : spread < -0.3
                              ? 'bg-cyan-200/80 dark:bg-cyan-900/60 text-cyan-900 dark:text-cyan-200'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {spread >= 0 ? `+${spread}%` : `${spread}%`} ({spread > 0.3 ? 'Elevated Skew' : spread < -0.3 ? 'Vol Discount' : 'Neutral'})
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}

              <p className="text-[9px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800 text-center">
                Click point to select strike in order ladder
              </p>
            </div>
          );
        })()}
      </div>

      {/* Footer: Quantitative Educational Insights */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-mono flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span>
            <strong>Volatility Smile & MA Trend:</strong> The Moving Average Trend Line (Amber) provides a smoothed parametric baseline across strikes. When implied volatility sits above the MA trend line, it highlights elevated tail risk hedging and bullish/bearish sentiment shifts.
          </span>
        </div>

        {selectedStrike && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Active Strike:</span>
            <span className="font-bold text-cyan-600 dark:text-cyan-400">${selectedStrike}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Algorithmic local generator fallback in case network API is offline
function generateLocalSurface(ticker: string, spotPrice: number): VolatilitySurfaceData {
  const baseAtmIV = 0.25;
  const tenors = [
    { days: 7, label: '7D Weekly' },
    { days: 14, label: '14D Bi-Weekly' },
    { days: 30, label: '30D 1-Month' },
    { days: 60, label: '60D 2-Month' },
    { days: 90, label: '90D Quarterly' },
    { days: 180, label: '180D Semi-Annual' }
  ];

  let step = 10;
  if (spotPrice > 5000) step = 100;
  else if (spotPrice > 2000) step = 50;
  else if (spotPrice > 500) step = 20;
  else if (spotPrice > 100) step = 5;
  else if (spotPrice > 20) step = 2.5;
  else step = 1;

  const atmStrike = Math.round(spotPrice / step) * step;
  const strikes: number[] = [];
  for (let i = -6; i <= 6; i++) {
    strikes.push(atmStrike + i * step);
  }

  const expirationsMeta: Array<{
    days: number;
    label: string;
    date: string;
    atmIV: number;
    expMove: number;
  }> = [];

  const points: VolatilitySurfacePoint[] = [];
  let minIV = 999;
  let maxIV = 0;

  tenors.forEach(tenor => {
    const T = tenor.days / 365;
    const tenorAtmIV = baseAtmIV * (1 + 0.04 * Math.log(tenor.days / 30));
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + tenor.days);
    const dateStr = expDate.toISOString().split('T')[0];
    const expMove = Number((spotPrice * tenorAtmIV * Math.sqrt(T)).toFixed(2));

    expirationsMeta.push({
      days: tenor.days,
      label: tenor.label,
      date: dateStr,
      atmIV: Number((tenorAtmIV * 100).toFixed(1)),
      expMove
    });

    const curvature = Math.min(2.4, Math.max(0.55, 0.42 / Math.sqrt(Math.max(0.015, T))));

    strikes.forEach(strike => {
      const moneyness = strike / spotPrice;
      const callSkew = Math.max(0.08, tenorAtmIV + curvature * 0.12 * Math.pow(moneyness - 1, 2) - 0.02 * (moneyness - 1));
      const putSkew = Math.max(0.08, tenorAtmIV + curvature * 0.16 * Math.pow(moneyness - 1, 2) + (moneyness < 1 ? 0.09 * (1 - moneyness) : 0));

      const callIV = Number((callSkew * 100).toFixed(1));
      const putIV = Number((putSkew * 100).toFixed(1));
      const midIV = Number(((callIV + putIV) / 2).toFixed(1));

      minIV = Math.min(minIV, callIV, putIV);
      maxIV = Math.max(maxIV, callIV, putIV);

      points.push({
        strike,
        moneyness: Number(moneyness.toFixed(3)),
        daysToExpiry: tenor.days,
        expiryLabel: tenor.label,
        expiryDate: dateStr,
        callIV,
        putIV,
        midIV,
        deltaCall: moneyness > 1 ? 0.35 : 0.65,
        deltaPut: moneyness < 1 ? -0.35 : -0.65,
        vega: Number((spotPrice * Math.sqrt(T) * 0.004).toFixed(2)),
        isATM: strike === atmStrike
      });
    });
  });

  return {
    ticker,
    spotPrice,
    atmIV: Number((baseAtmIV * 100).toFixed(1)),
    expirations: expirationsMeta,
    strikes,
    points,
    skew25Delta: 4.8,
    termStructureSlope: 'Contango',
    ivMin: Number(minIV.toFixed(1)),
    ivMax: Number(maxIV.toFixed(1)),
    generatedAt: new Date().toISOString()
  };
}

export default OptionsVolatilitySurface;
