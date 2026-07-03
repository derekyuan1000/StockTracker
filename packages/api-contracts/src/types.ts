export type UserSettings = {
  portfolioPublic: boolean;
  theme: "dark" | "light" | "system";
  onboarded: boolean;
};

export type PublicTrade = {
  displayName: string;
  type: "buy" | "sell";
  ticker: string;
  name: string;
  units: number;
  price: number;
  amountGBP: number;
  date: string;
};

export type LeaderboardEntry = {
  displayName: string;
  userId: string;
  costGBP: number;
  gainGBP: number;
  gainPct: number;
  monthGainPct: number | null;
  yearGainPct: number | null;
};

export type TickerItem = {
  ticker: string;
  name: string;
  last: number;
  changePct: number;
};

export type PublicProfile = {
  userId: string;
  displayName: string;
  trades: PublicTrade[];
  stats: {
    totalInvestedGBP: number;
    realisedGL: number;
    tradeCount: number;
  };
};

export type WidgetSummary = {
  totalGBP: number;
  dayChangeGBP: number;
  dayChangePct: number;
  asOf: string;
};

export const DEFAULT_SETTINGS: UserSettings = {
  portfolioPublic: false,
  theme: "dark",
  onboarded: false,
};
