/**
 * Price Chart Component
 * 
 * TradingView-style price chart using lightweight-charts v5.
 * Shows historical price data for market outcomes.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { 
  createChart, 
  ColorType, 
  AreaSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi, 
  type ISeriesApi, 
  type UTCTimestamp,
  type AreaSeriesPartialOptions,
  type HistogramSeriesPartialOptions,
  type LineSeriesPartialOptions,
} from "lightweight-charts";
import { getPriceHistory } from "@/lib/polymarket/marketApi";
import { useLivePrice } from "@/stores/websocketStore";
import { Loader2, TrendingUp, TrendingDown, BarChart3, Wifi } from "lucide-react";

// ============= Types =============

interface PriceChartProps {
  tokenId: string;
  outcome?: string;
  height?: number;
  showVolume?: boolean;
}

type TimeFrame = "1H" | "4H" | "1D" | "1W" | "1M" | "ALL";

interface ChartData {
  time: UTCTimestamp;
  value: number;
}

interface VolumeData {
  time: UTCTimestamp;
  value: number;
  color: string;
}

// ============= Constants =============

// API intervals: "1m" | "1h" | "6h" | "1d" | "1w" | "max"
const TIME_FRAMES: Array<{ id: TimeFrame; label: string; interval: string; fidelity: number }> = [
  { id: "1H", label: "1H", interval: "1h", fidelity: 1 },
  { id: "4H", label: "4H", interval: "6h", fidelity: 5 },
  { id: "1D", label: "1D", interval: "1d", fidelity: 15 },
  { id: "1W", label: "1W", interval: "1w", fidelity: 60 },
  { id: "1M", label: "1M", interval: "max", fidelity: 360 },
  { id: "ALL", label: "All", interval: "max", fidelity: 1440 },
];

const CHART_COLORS = {
  background: "#0f0f12",
  text: "#9ca3af",
  grid: "#1e1e23",
  upColor: "#10b981",
  downColor: "#f43f5e",
  lineColor: "#a78bfa",
  areaTopColor: "rgba(167, 139, 250, 0.25)",
  areaBottomColor: "rgba(167, 139, 250, 0.02)",
  volumeUp: "rgba(16, 185, 129, 0.4)",
  volumeDown: "rgba(244, 63, 94, 0.4)",
};

// ============= Component =============

export function PriceChart({
  tokenId,
  outcome = "Yes",
  height = 300,
  showVolume = true,
}: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const [timeFrame, setTimeFrame] = useState<TimeFrame>("1D");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceChange, setPriceChange] = useState<{ value: number; percent: number } | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);
  const [lastPrice, setLastPrice] = useState<number | null>(null);

  // Fetch and update chart data
  const fetchData = useCallback(async () => {
    // API requires tokenId (NOT condition_id/marketId)
    if (!tokenId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const frame = TIME_FRAMES.find(f => f.id === timeFrame) || TIME_FRAMES[2];
      const historyResult = await getPriceHistory(tokenId, { 
        interval: frame.interval as "1m" | "1h" | "6h" | "1d" | "1w" | "max",
        fidelity: frame.fidelity 
      });
      const history = historyResult.history || [];

      if (!history || history.length === 0) {
        setError("No price data available");
        return;
      }

      // Convert to chart format
      const chartData: ChartData[] = history.map((point: { t: number; p: number }) => ({
        time: point.t as UTCTimestamp,
        value: point.p,
      }));

      // Sort by time
      chartData.sort((a, b) => a.time - b.time);

      // Calculate price change
      if (chartData.length >= 2) {
        const firstPrice = chartData[0].value;
        const lastPrice = chartData[chartData.length - 1].value;
        const change = lastPrice - firstPrice;
        const percent = firstPrice > 0 ? (change / firstPrice) * 100 : 0;
        setPriceChange({ value: change, percent });
      }

      // Update chart
      if (areaSeriesRef.current) {
        areaSeriesRef.current.setData(chartData);
      }

      // Volume data (if available)
      if (showVolume && volumeSeriesRef.current) {
        const volumeData: VolumeData[] = chartData.map((point, i) => ({
          time: point.time,
          value: Math.random() * 10000, // Placeholder - real volume from API
          color: i > 0 && point.value >= chartData[i - 1].value 
            ? CHART_COLORS.volumeUp 
            : CHART_COLORS.volumeDown,
        }));
        volumeSeriesRef.current.setData(volumeData);
      }

      // Fit content
      chartRef.current?.timeScale().fitContent();

    } catch (err) {
      console.error("[PriceChart] Error fetching data:", err);
      setError("Failed to load price data");
    } finally {
      setIsLoading(false);
    }
  }, [tokenId, timeFrame, showVolume]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.background },
        textColor: CHART_COLORS.text,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: {
        mode: 1, // Magnet mode
        vertLine: {
          color: "#8b5cf6",
          width: 1,
          style: 2,
          labelBackgroundColor: "#8b5cf6",
        },
        horzLine: {
          color: "#8b5cf6",
          width: 1,
          style: 2,
          labelBackgroundColor: "#8b5cf6",
        },
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.grid,
        scaleMargins: {
          top: 0.1,
          bottom: showVolume ? 0.2 : 0.1,
        },
      },
      timeScale: {
        borderColor: CHART_COLORS.grid,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // Create area series for price (v5 API)
    const areaSeriesOptions: AreaSeriesPartialOptions = {
      lineColor: CHART_COLORS.lineColor,
      topColor: CHART_COLORS.areaTopColor,
      bottomColor: CHART_COLORS.areaBottomColor,
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `${(price * 100).toFixed(1)}¢`,
      },
    };
    const areaSeries = chart.addSeries(AreaSeries, areaSeriesOptions);
    areaSeriesRef.current = areaSeries;

    // Create volume series
    if (showVolume) {
      const volumeSeriesOptions: HistogramSeriesPartialOptions = {
        priceFormat: { type: "volume" },
        priceScaleId: "",
      };
      const volumeSeries = chart.addSeries(HistogramSeries, volumeSeriesOptions);
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.85,
          bottom: 0,
        },
      });
      volumeSeriesRef.current = volumeSeries;
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      areaSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height, showVolume]);

  // Fetch data on timeframe change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // WebSocket real-time updates via store
  const livePrice = useLivePrice(tokenId);
  
  useEffect(() => {
    if (!livePrice || !areaSeriesRef.current) return;

    const price = parseFloat(livePrice.price);
    const timestamp = Math.floor(livePrice.timestamp / 1000) as UTCTimestamp;
    
    // Update chart with new price point
    areaSeriesRef.current.update({
      time: timestamp,
      value: price,
    });

    setLastPrice(price);
    setIsRealtime(true);
  }, [livePrice]);

  return (
    <div className="bg-gradient-to-br from-[#0f0f12] to-[#1a1a20] rounded-2xl border border-[#2d2d3a] shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 border-b border-[#2d2d3a] bg-[#0f0f12]/50">
        {/* Left Section: Title and Live Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#a78bfa]/20 to-[#7c3aed]/10">
              <BarChart3 className="w-5 h-5 text-[#a78bfa]" />
            </div>
            <span className="text-lg font-semibold text-white">{outcome} Price</span>
            {isRealtime && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 ml-2 bg-[#10b981]/15 rounded-lg">
                <Wifi className="w-3 h-3 text-[#10b981] animate-pulse" />
                <span className="text-xs font-medium text-[#10b981]">Live</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Price Info and Timeframe */}
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-start sm:items-center justify-between sm:justify-end gap-3">
          {/* Price Change Info */}
          {priceChange && !isLoading && (
            <div className="flex items-center gap-3 px-4 py-2 bg-[#1a1a20] rounded-lg">
              <div className={`flex items-center gap-1.5 ${
                priceChange.value >= 0 ? "text-[#10b981]" : "text-[#f43f5e]"
              }`}>
                {priceChange.value >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="font-semibold">
                  {priceChange.value >= 0 ? "+" : ""}
                  {(priceChange.value * 100).toFixed(1)}¢
                </span>
              </div>
              <span className={`text-sm ${
                priceChange.percent >= 0 ? "text-[#10b981]" : "text-[#f43f5e]"
              }`}>
                ({priceChange.percent >= 0 ? "+" : ""}
                {priceChange.percent.toFixed(1)}%)
              </span>
            </div>
          )}

          {/* Current Price */}
          {lastPrice && (
            <div className="text-lg font-bold text-white">
              ${lastPrice.toFixed(3)}
            </div>
          )}

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 p-1.5 bg-[#1a1a20] rounded-lg border border-[#2d2d3a]">
            {TIME_FRAMES.map((frame) => (
              <button
                key={frame.id}
                onClick={() => setTimeFrame(frame.id)}
                className={`
                  px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200
                  ${timeFrame === frame.id
                    ? "bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white shadow-lg shadow-purple-500/30"
                    : "text-[#9ca3af] hover:text-white hover:bg-[#2d2d3a]"
                  }
                `}
              >
                {frame.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative bg-[#0f0f12]" style={{ minHeight: `${height}px` }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f12]/80 z-10 backdrop-blur-sm rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-[#a78bfa] animate-spin" />
              <p className="text-sm text-[#9ca3af]">Loading chart...</p>
            </div>
          </div>
        )}
        
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f12]/80 z-10 backdrop-blur-sm rounded-lg">
            <div className="text-center p-6">
              <p className="text-[#f43f5e] mb-3 font-medium">{error}</p>
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-[#a78bfa] hover:bg-[#8b5cf6] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <div ref={chartContainerRef} className="w-full" />
      </div>
    </div>
  );
}

// ============= Mini Price Chart (for cards) =============

interface MiniPriceChartProps {
  tokenId: string;
  width?: number;
  height?: number;
}

export function MiniPriceChart({ tokenId, width = 100, height = 40 }: MiniPriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !tokenId) return;

    const chart = createChart(chartContainerRef.current, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "transparent",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: { visible: false },
      timeScale: { visible: false },
      crosshair: { mode: 0 },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    // v5 API: use addSeries with LineSeries
    const lineSeriesOptions: LineSeriesPartialOptions = {
      color: CHART_COLORS.lineColor,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    };
    const lineSeries = chart.addSeries(LineSeries, lineSeriesOptions);

    // Fetch mini chart data using tokenId (required by API)
    getPriceHistory(tokenId, { interval: "1d", fidelity: 60 }).then(result => {
      const history = result.history || [];
      if (history && history.length > 0) {
        const data = history.map((point: { t: number; p: number }) => ({
          time: point.t as UTCTimestamp,
          value: point.p,
        }));
        data.sort((a: { time: number }, b: { time: number }) => a.time - b.time);
        lineSeries.setData(data);
        chart.timeScale().fitContent();
      }
    }).catch(console.error);

    return () => {
      chart.remove();
    };
  }, [tokenId, width, height]);

  return <div ref={chartContainerRef} />;
}
