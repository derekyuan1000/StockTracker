import Anthropic from "@anthropic-ai/sdk";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { aiInsights } from "@/server/db/schema";
import type { PortfolioAnalysis } from "@stocktracker/api-contracts";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getInsights(
  userId: string,
  analysis: PortfolioAnalysis,
  forceRefresh = false,
): Promise<{ narrative: string; model: string; cached: boolean }> {
  const day = todayStr();

  if (!forceRefresh) {
    const [cached] = await db
      .select()
      .from(aiInsights)
      .where(and(eq(aiInsights.userId, userId), eq(aiInsights.day, day)))
      .limit(1);
    if (cached) return { narrative: cached.narrative, model: cached.model, cached: true };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      narrative:
        "AI insights are unavailable (no API key configured). Add ANTHROPIC_API_KEY to your environment variables to enable this feature.",
      model: "none",
      cached: false,
    };
  }

  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  const client = new Anthropic({ apiKey });

  const payload = {
    range: analysis.range,
    risk: {
      annualizedVolPct: analysis.risk.annualizedVolPct.toFixed(1),
      sharpePct: analysis.risk.sharpePct.toFixed(2),
      maxDrawdownPct: analysis.risk.maxDrawdownPct.toFixed(1),
      betaVsBenchmark: analysis.risk.betaVsBenchmark?.toFixed(2) ?? null,
    },
    diversification: {
      hhi: Math.round(analysis.diversification.hhi),
      topHoldings: analysis.diversification.topHoldingsConcentration.map((h) => ({
        ticker: h.ticker,
        allocPct: h.allocPct.toFixed(1),
      })),
      bySector: analysis.diversification.bySector.slice(0, 6).map((s) => ({
        label: s.label,
        pct: s.pct.toFixed(1),
      })),
    },
    attribution: {
      topContributors: analysis.attribution.byHolding.slice(0, 5).map((h) => ({
        ticker: h.ticker,
        periodReturnPct: h.periodReturnPct.toFixed(1),
        contribution: h.contribution.toFixed(2),
      })),
    },
    income: {
      projectedAnnualGBP: analysis.income.projectedAnnualGBP.toFixed(2),
      portfolioYieldPct: analysis.income.portfolioYieldPct.toFixed(2),
    },
  };

  const prompt = `You are a portfolio analyst. Given the following portfolio analytics data, write a concise 3-4 paragraph plain-English summary covering: (1) overall risk profile and what the volatility/Sharpe/drawdown figures mean for the investor, (2) diversification quality and concentration risks, (3) performance attribution highlights, and (4) dividend income outlook. Be specific, mention tickers and numbers, and keep a neutral, informative tone. Do not use markdown headers.

Portfolio data (range: ${payload.range}):
${JSON.stringify(payload, null, 2)}`;

  let narrative = "";
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "end_turn") {
      for (const block of response.content) {
        if (block.type === "text") narrative += block.text;
      }
    }
  } catch {
    return {
      narrative: "Unable to generate insights at this time. Please try again later.",
      model,
      cached: false,
    };
  }

  if (!narrative) {
    return { narrative: "No insights generated. Please try again.", model, cached: false };
  }

  await db
    .insert(aiInsights)
    .values({ userId, day, narrative, model })
    .onConflictDoUpdate({
      target: [aiInsights.userId, aiInsights.day],
      set: { narrative, model, createdAt: new Date() },
    });

  return { narrative, model, cached: false };
}
