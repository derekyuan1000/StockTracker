import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const STEPS = [
  {
    target: "nav-tabs",
    title: "Your navigation hub",
    description:
      "Jump between Summary, Holdings, Fundamentals, Transactions, and Community from here.",
  },
  {
    target: "tab-holdings",
    title: "Track your positions",
    description:
      "Add every stock you own. See real-time P&L, target allocation, and sector breakdown.",
  },
  {
    target: "tab-fundamentals",
    title: "Research your holdings",
    description:
      "Charts, valuation ratios, analyst consensus, and earnings history — all in one place.",
  },
  {
    target: "tab-community",
    title: "Compare with others",
    description: "See what other investors are trading and rank portfolios on the leaderboard.",
  },
  {
    target: "settings-btn",
    title: "Your preferences",
    description: "Change theme, portfolio visibility, and account settings any time.",
  },
] as const;

const PAD = 8;
const TOOLTIP_W = 300;
const OVERLAY = "rgba(0,0,0,0.65)";
const TRANS =
  "top 280ms ease, left 280ms ease, right 280ms ease, bottom 280ms ease, width 280ms ease, height 280ms ease";

export function OnboardingTour({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>(0);

  const current = STEPS[step];

  useEffect(() => {
    function update() {
      const el = document.querySelector(`[data-tour="${current.target}"]`);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        rafRef.current = requestAnimationFrame(update);
      }
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [current.target]);

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else onDone();
  }

  if (!rect) return null;

  const sTop = Math.max(0, rect.top - PAD);
  const sLeft = Math.max(0, rect.left - PAD);
  const sW = rect.width + PAD * 2;
  const sH = rect.height + PAD * 2;
  const sBottom = sTop + sH;
  const sRight = sLeft + sW;
  const vH = window.innerHeight;
  const vW = window.innerWidth;

  const below = sBottom + 200 < vH;
  const tipTop = below ? sBottom + 12 : sTop - 12 - 175;
  const tipLeft = Math.max(12, Math.min(sLeft, vW - TOOLTIP_W - 12));

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none" }}>
      {/* Overlay panels — four quadrants around the spotlight */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: sTop,
          background: OVERLAY,
          pointerEvents: "auto",
          transition: TRANS,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: sBottom,
          left: 0,
          right: 0,
          bottom: 0,
          background: OVERLAY,
          pointerEvents: "auto",
          transition: TRANS,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: sTop,
          left: 0,
          width: sLeft,
          height: sH,
          background: OVERLAY,
          pointerEvents: "auto",
          transition: TRANS,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: sTop,
          left: sRight,
          right: 0,
          height: sH,
          background: OVERLAY,
          pointerEvents: "auto",
          transition: TRANS,
        }}
      />

      {/* Tooltip card */}
      <div
        style={{
          position: "absolute",
          top: tipTop,
          left: tipLeft,
          width: TOOLTIP_W,
          pointerEvents: "auto",
          transition: "top 280ms ease, left 280ms ease",
        }}
        className="rounded-sm border border-hairline bg-[var(--surface-card)] p-5 shadow-xl"
      >
        <span className="eyebrow text-text-muted">
          {step + 1} / {STEPS.length}
        </span>
        <h3 className="mt-2 text-sm font-semibold tracking-[-0.01em] text-text-strong">
          {current.title}
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">{current.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={onDone}
            className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-text-body"
          >
            Skip tour
          </button>
          <button
            onClick={next}
            className="rounded-sm bg-[var(--accent-mint)] px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--canvas-dark)] transition-opacity hover:opacity-80"
          >
            {step < STEPS.length - 1 ? "Next →" : "Finish"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
