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
import { Loader2, TrendingUp, TrendingDown, BarChart3, Wifi, WifiOff } from "lucide-react";

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
  background: "#0a0a0b",
  text: "#71717a",
  grid: "#27272a",
  upColor: "#22c55e",
  downColor: "#ef4444",
  lineColor: "#8b5cf6",
  areaTopColor: "rgba(139, 92, 246, 0.4)",
  areaBottomColor: "rgba(139, 92, 246, 0.0)",
  volumeUp: "rgba(34, 197, 94, 0.5)",
  volumeDown: "rgba(239, 68, 68, 0.5)",
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
    <div className="bg-[#16161a] rounded-xl border border-[#27272a] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#8b5cf6]" />
            <span className="font-medium">{outcome} Price</span>
            {isRealtime && (
              <div className="flex items-center gap-1 text-xs text-[#22c55e]">
                <Wifi className="w-3 h-3 animate-pulse" />
                <span>Live</span>
              </div>
            )}
          </div>
          
          {priceChange && !isLoading && (
            <div className={`flex items-center gap-1 text-sm ${
              priceChange.value >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
            }`}>
              {priceChange.value >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>
                {priceChange.value >= 0 ? "+" : ""}
                {(priceChange.value * 100).toFixed(1)}¢
              </span>
              <span className="text-[#71717a]">
                ({priceChange.percent >= 0 ? "+" : ""}
                {priceChange.percent.toFixed(1)}%)
              </span>
            </div>
          )}

          {lastPrice && (
            <div className="text-sm text-[#a1a1aa]">
              ${lastPrice.toFixed(3)}
            </div>
          )}
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 p-1 bg-[#0a0a0b] rounded-lg">
          {TIME_FRAMES.map((frame) => (
            <button
              key={frame.id}
              onClick={() => setTimeFrame(frame.id)}
              className={`
                px-3 py-1 rounded-md text-xs font-medium transition-colors
                ${timeFrame === frame.id
                  ? "bg-[#8b5cf6] text-white"
                  : "text-[#71717a] hover:text-white"
                }
              `}
            >
              {frame.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#16161a]/80 z-10">
            <Loader2 className="w-8 h-8 text-[#8b5cf6] animate-spin" />
          </div>
        )}
        
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#16161a]/80 z-10">
            <div className="text-center">
              <p className="text-[#ef4444] mb-2">{error}</p>
              <button
                onClick={fetchData}
                className="text-sm text-[#8b5cf6] hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <div ref={chartContainerRef} />
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
