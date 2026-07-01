interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export function Logo({ size = 20, showWordmark = true, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Three ascending candlestick bars */}

        {/* Bar 1 — short, muted */}
        <line
          x1="4"
          y1="11"
          x2="4"
          y2="14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.35"
        />
        <rect x="2" y="14" width="4" height="6" rx="0.75" fill="currentColor" opacity="0.35" />
        <line
          x1="4"
          y1="20"
          x2="4"
          y2="22"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.35"
        />

        {/* Bar 2 — medium */}
        <line
          x1="12"
          y1="7"
          x2="12"
          y2="10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.55"
        />
        <rect x="10" y="10" width="4" height="8" rx="0.75" fill="currentColor" opacity="0.55" />
        <line
          x1="12"
          y1="18"
          x2="12"
          y2="21"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.55"
        />

        {/* Bar 3 — tall, primary accent */}
        <line
          x1="20"
          y1="2"
          x2="20"
          y2="5"
          stroke="var(--primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <rect x="18" y="5" width="4" height="12" rx="0.75" fill="var(--primary)" />
        <line
          x1="20"
          y1="17"
          x2="20"
          y2="20"
          stroke="var(--primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      {showWordmark && (
        <span className="text-sm font-bold tracking-tight text-[var(--primary)]">StockTracker</span>
      )}
    </div>
  );
}
