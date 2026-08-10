import { useMemo, useState } from "react";
import { View, GestureResponderEvent } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Path, Line as SvgLine, Circle, Text as SvgText, G } from "react-native-svg";
import { scaleLinear } from "d3-scale";
import { line as d3line, area as d3area, curveMonotoneX } from "d3-shape";
import { fmtGBP } from "@stocktracker/shared";
import { useTheme } from "@/theme/ThemeProvider";
import type { HistoryRange, HistoryPoint } from "@/api/endpoints";

const HEIGHT = 220;
const PAD = { top: 10, right: 8, bottom: 24, left: 8 };

function formatXTick(ts: number, range: HistoryRange): string {
  const d = new Date(ts);
  if (range === "1D" || range === "5D") {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

const formatYTick = (v: number) => `£${(v / 1000).toFixed(1)}k`;

export function PerformanceChart({
  data,
  range,
  width,
}: {
  data: HistoryPoint[];
  range: HistoryRange;
  width: number;
}) {
  const { t } = useTheme();
  const [touchIndex, setTouchIndex] = useState<number | null>(null);

  const innerWidth = width - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;

  const { linePath, areaPath, x, points, yMin, yMax } = useMemo(() => {
    if (!data.length || innerWidth <= 0) {
      return { linePath: "", areaPath: "", x: null, points: [] as HistoryPoint[], yMin: 0, yMax: 1 };
    }
    const values = data.map((d) => d.value);
    const yMin = Math.min(...values) * 0.998;
    const yMax = Math.max(...values) * 1.002;

    const xScale = scaleLinear()
      .domain([data[0].ts, data[data.length - 1].ts])
      .range([0, innerWidth]);
    const yScale = scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]);

    const lineGen = d3line<HistoryPoint>()
      .x((d) => xScale(d.ts))
      .y((d) => yScale(d.value))
      .curve(curveMonotoneX);
    const areaGen = d3area<HistoryPoint>()
      .x((d) => xScale(d.ts))
      .y0(innerHeight)
      .y1((d) => yScale(d.value))
      .curve(curveMonotoneX);

    return {
      linePath: lineGen(data) ?? "",
      areaPath: areaGen(data) ?? "",
      x: xScale,
      points: data,
      yMin,
      yMax,
    };
  }, [data, innerWidth, innerHeight]);

  function handleTouch(e: GestureResponderEvent) {
    if (!x || !points.length) return;
    const localX = e.nativeEvent.locationX - PAD.left;
    const ts = x.invert(localX);
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.ts - ts);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setTouchIndex(nearest);
  }

  if (!data.length) {
    return (
      <View style={{ height: HEIGHT, alignItems: "center", justifyContent: "center" }}>
        <SvgText fill={t.textMuted} fontSize={12}>
          No data for this range
        </SvgText>
      </View>
    );
  }

  // Show ~4 evenly spaced X ticks regardless of point density.
  const tickCount = Math.min(4, points.length);
  const tickIndices = Array.from({ length: tickCount }, (_, i) =>
    Math.round((i * (points.length - 1)) / Math.max(1, tickCount - 1)),
  );
  const yTicks = [yMin, (yMin + yMax) / 2, yMax];

  const active = touchIndex != null ? points[touchIndex] : null;

  return (
    <View
      onStartShouldSetResponder={() => true}
      onResponderMove={handleTouch}
      onResponderGrant={handleTouch}
      onResponderRelease={() => setTouchIndex(null)}
    >
      <Svg width={width} height={HEIGHT}>
        <Defs>
          <LinearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={t.brandPeriwinkle} stopOpacity={0.35} />
            <Stop offset="1" stopColor={t.brandPeriwinkle} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <G translateX={PAD.left} translateY={PAD.top}>
          {/* Y gridline labels */}
          {yTicks.map((v, i) => (
            <SvgText
              key={i}
              x={0}
              y={innerHeight - (i / (yTicks.length - 1)) * innerHeight - 4}
              fontSize={10}
              fontFamily="JetBrainsMono_400Regular"
              fill={t.textMuted}
            >
              {formatYTick(v)}
            </SvgText>
          ))}

          <Path d={areaPath} fill="url(#perfGrad)" />
          <Path d={linePath} stroke={t.brandPeriwinkle} strokeWidth={2} fill="none" />

          {/* X axis line + tick labels */}
          <SvgLine x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={t.hairline} strokeWidth={1} />
          {tickIndices.map((idx) => {
            const p = points[idx];
            const cx = x ? x(p.ts) : 0;
            return (
              <SvgText
                key={idx}
                x={cx}
                y={innerHeight + 16}
                fontSize={10}
                fontFamily="JetBrainsMono_400Regular"
                fill={t.textMuted}
                textAnchor="middle"
              >
                {formatXTick(p.ts, range)}
              </SvgText>
            );
          })}

          {/* Touch scrub indicator */}
          {active && x ? (
            <>
              <SvgLine
                x1={x(active.ts)}
                y1={0}
                x2={x(active.ts)}
                y2={innerHeight}
                stroke={t.brandPeriwinkle}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <Circle
                cx={x(active.ts)}
                cy={scaleLinear().domain([yMin, yMax]).range([innerHeight, 0])(active.value)}
                r={4}
                fill={t.brandPeriwinkle}
              />
            </>
          ) : null}
        </G>
      </Svg>
      {active ? (
        <View style={{ position: "absolute", top: 4, right: 8 }}>
          <SvgText fill={t.textStrong} fontSize={13} fontFamily="JetBrainsMono_500Medium">
            {fmtGBP(active.value)}
          </SvgText>
        </View>
      ) : null}
    </View>
  );
}
