import { dir } from "@stocktracker/shared";

export {
  fmtGBP,
  fmtGBPSigned,
  fmtPct,
  fmtNum,
  fmtCompact,
  fmtWordNum,
  fmtMarketTime,
  dir,
} from "@stocktracker/shared";

// Web-only: Tailwind class name keyed off the platform-agnostic `dir()` token.
export const dirClass = (v: number) =>
  ({
    up: "text-[var(--up)]",
    down: "text-[var(--down)]",
    flat: "text-text-muted-strong",
  })[dir(v)];
