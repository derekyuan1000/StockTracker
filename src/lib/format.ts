export const fmtGBP = (v: number, fractionDigits = 2) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(v);

export const fmtGBPSigned = (v: number, fractionDigits = 2) => {
  const s = fmtGBP(Math.abs(v), fractionDigits);
  return (v >= 0 ? "+" : "−") + s;
};

export const fmtPct = (v: number, digits = 2) => `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;

export const fmtNum = (v: number, digits = 0) =>
  new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);

export const fmtCompact = (v: number) =>
  new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(v);

export const fmtWordNum = (v: number): string => {
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${(v / 1e12).toFixed(2)} trillion`;
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)} billion`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)} million`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(2)} thousand`;
  return v.toFixed(2);
};

export const dirClass = (v: number) =>
  v > 0 ? "text-[var(--up)]" : v < 0 ? "text-[var(--down)]" : "text-text-muted-strong";

export const fmtMarketTime = (iso: string): string => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/London",
      timeZoneName: "short",
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("hour")}:${get("minute")} ${get("timeZoneName")}`;
  } catch {
    return "—";
  }
};
