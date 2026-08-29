import type { OHLCBar } from "@/server/market/types";

export interface IndicatorOpts {
  sma?: number[];
  ema?: number[];
  bollinger?: { period?: number; mult?: number };
  rsi?: { period?: number };
  macd?: { fast?: number; slow?: number; signal?: number };
}

export interface IndicatorRow extends OHLCBar {
  wickRange: [number, number]; // [low, high] — Recharts ranged-bar dataKey for candlesticks
  sma: Record<number, number | null>;
  ema: Record<number, number | null>;
  bollUpper: number | null;
  bollMid: number | null;
  bollLower: number | null;
  rsi: number | null;
  macdLine: number | null;
  macdSignal: number | null;
  macdHist: number | null;
}

function calcSma(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    result.push(i < period - 1 ? null : sum / period);
  }
  return result;
}

function calcEma(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let prev: number | null = null;
  let seedSum = 0;

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      seedSum += values[i];
      result.push(null);
    } else if (i === period - 1) {
      seedSum += values[i];
      prev = seedSum / period;
      result.push(prev);
    } else {
      prev = values[i] * k + prev! * (1 - k);
      result.push(prev);
    }
  }
  return result;
}

function calcBollinger(closes: number[], period = 20, mult = 2) {
  const mids = calcSma(closes, period);
  return mids.map((mid, i) => {
    if (mid === null) return { upper: null, mid: null, lower: null };
    const slice = closes.slice(i - period + 1, i + 1);
    const variance = slice.reduce((s, v) => s + (v - mid) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    return { upper: mid + mult * std, mid, lower: mid - mult * std };
  });
}

function calcRsi(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = closes.map(() => null);
  if (closes.length < period + 1) return result;

  const changes = closes.slice(1).map((c, i) => c - closes[i]);
  let avgGain = changes.slice(0, period).reduce((s, d) => s + Math.max(d, 0), 0) / period;
  let avgLoss = changes.slice(0, period).reduce((s, d) => s + Math.max(-d, 0), 0) / period;

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + Math.max(changes[i], 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-changes[i], 0)) / period;
    result[i + 1] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

function calcMacd(closes: number[], fast = 12, slow = 26, signal = 9) {
  const fastEma = calcEma(closes, fast);
  const slowEma = calcEma(closes, slow);

  const macdLine: (number | null)[] = fastEma.map((f, i) => {
    const s = slowEma[i];
    return f !== null && s !== null ? f - s : null;
  });

  const signalLine: (number | null)[] = macdLine.map(() => null);
  const k = 2 / (signal + 1);
  let prev: number | null = null;
  let warmup = 0;

  for (let i = 0; i < macdLine.length; i++) {
    const m = macdLine[i];
    if (m === null) continue;
    warmup++;
    if (warmup < signal) {
      // accumulating for SMA seed — prev stays null
    } else if (warmup === signal) {
      let sum = 0,
        cnt = 0;
      for (let j = 0; j <= i; j++) {
        if (macdLine[j] !== null) {
          sum += macdLine[j]!;
          cnt++;
        }
      }
      prev = sum / cnt;
      signalLine[i] = prev;
    } else {
      prev = m * k + prev! * (1 - k);
      signalLine[i] = prev;
    }
  }

  const hist: (number | null)[] = macdLine.map((m, i) => {
    const s = signalLine[i];
    return m !== null && s !== null ? m - s : null;
  });

  return { macdLine, signalLine, hist };
}

export function buildIndicatorRows(bars: OHLCBar[], opts: IndicatorOpts): IndicatorRow[] {
  const closes = bars.map((b) => b.close);

  const smaArrays: Record<number, (number | null)[]> = {};
  for (const p of opts.sma ?? []) smaArrays[p] = calcSma(closes, p);

  const emaArrays: Record<number, (number | null)[]> = {};
  for (const p of opts.ema ?? []) emaArrays[p] = calcEma(closes, p);

  const boll = opts.bollinger
    ? calcBollinger(closes, opts.bollinger.period ?? 20, opts.bollinger.mult ?? 2)
    : null;

  const rsiValues = opts.rsi ? calcRsi(closes, opts.rsi.period ?? 14) : null;
  const macdResult = opts.macd
    ? calcMacd(closes, opts.macd.fast ?? 12, opts.macd.slow ?? 26, opts.macd.signal ?? 9)
    : null;

  return bars.map((bar, i) => {
    const sma: Record<number, number | null> = {};
    for (const p of opts.sma ?? []) sma[p] = smaArrays[p][i];

    const ema: Record<number, number | null> = {};
    for (const p of opts.ema ?? []) ema[p] = emaArrays[p][i];

    return {
      ...bar,
      wickRange: [bar.low, bar.high] as [number, number],
      sma,
      ema,
      bollUpper: boll ? boll[i].upper : null,
      bollMid: boll ? boll[i].mid : null,
      bollLower: boll ? boll[i].lower : null,
      rsi: rsiValues ? rsiValues[i] : null,
      macdLine: macdResult ? macdResult.macdLine[i] : null,
      macdSignal: macdResult ? macdResult.signalLine[i] : null,
      macdHist: macdResult ? macdResult.hist[i] : null,
    };
  });
}
