import { expect, test, describe } from "bun:test";
import { compute, fxFactor, type Holding } from "./portfolio";
import { fmtMoney, fmtNative } from "./format";

// Minimal holding builder — only the fields compute() reads matter here.
function holding(over: Partial<Holding>): Holding {
  return {
    ticker: "X",
    name: "X",
    bucket: "Stock",
    sector: "",
    units: 0,
    avgBuyP: 0,
    currency: "GBp",
    lastPrice: 0,
    prevClose: 0,
    dayLow: 0,
    dayHigh: 0,
    yearLow: 0,
    yearHigh: 0,
    volume: 0,
    avgVol3m: 0,
    marketTime: "",
    targetP: 0,
    allocTarget: 0,
    holdPeriodDays: 0,
    spark: [],
    ...over,
  };
}

describe("fxFactor", () => {
  test("pence folds to /100 when no rate stamped", () => {
    expect(fxFactor({ currency: "GBp" })).toBe(1 / 100);
  });
  test("pounds are 1:1 when no rate stamped", () => {
    expect(fxFactor({ currency: "GBP" })).toBe(1);
  });
  test("a foreign currency without a stamped rate falls back to 1:1", () => {
    expect(fxFactor({ currency: "USD" })).toBe(1);
  });
  test("a stamped rate takes precedence", () => {
    expect(fxFactor({ currency: "USD", fxToGBP: 0.79 })).toBe(0.79);
  });
});

describe("compute — regression guard (GBp/GBP behave exactly as before)", () => {
  test("GBp holding: 1000 units @ 250p = £2,500", () => {
    const p = compute([holding({ currency: "GBp", units: 1000, avgBuyP: 100, lastPrice: 250 })], 0);
    expect(p.marketValue).toBeCloseTo(2500, 6);
    expect(p.cost).toBeCloseTo(1000, 6);
    expect(p.rows[0].nativePrice).toBe(250);
    expect(p.rows[0].nativeCurrency).toBe("GBp");
  });
  test("GBP fund: 10 units @ £120 = £1,200", () => {
    const p = compute([holding({ currency: "GBP", units: 10, avgBuyP: 100, lastPrice: 120 })], 0);
    expect(p.marketValue).toBeCloseTo(1200, 6);
  });
});

describe("compute — FX correctness (the bug fix)", () => {
  test("USD holding is converted to GBP, not treated 1:1", () => {
    // 10 shares @ $150, GBP/USD = 0.80 → £1,200. Before the fix this was £1,500.
    const p = compute(
      [holding({ currency: "USD", fxToGBP: 0.8, units: 10, avgBuyP: 100, lastPrice: 150 })],
      0,
    );
    expect(p.marketValue).toBeCloseTo(1200, 6);
    expect(p.cost).toBeCloseTo(800, 6);
    expect(p.rows[0].nativePrice).toBe(150);
    expect(p.rows[0].nativeCurrency).toBe("USD");
  });

  test("mixed-currency portfolio sums correctly in GBP", () => {
    const p = compute(
      [
        holding({ currency: "GBp", units: 1000, lastPrice: 250 }), // £2,500
        holding({ currency: "USD", fxToGBP: 0.8, units: 10, lastPrice: 150 }), // £1,200
      ],
      500, // cash
    );
    expect(p.marketValue).toBeCloseTo(3700, 6);
    expect(p.totalValue).toBeCloseTo(4200, 6);
  });
});

describe("fmtMoney / fmtNative", () => {
  test("fmtMoney converts a GBP value into the display currency", () => {
    // £1,200 at GBP→USD 1.25 = $1,500.00
    expect(fmtMoney(1200, { currency: "USD", rate: 1.25 })).toBe("$1,500.00");
  });
  test("fmtMoney with default GBP is a plain GBP format", () => {
    expect(fmtMoney(1200)).toBe("£1,200.00");
  });
  test("fmtNative renders pence with a trailing p", () => {
    expect(fmtNative(250, "GBp")).toBe("250.00p");
  });
});
