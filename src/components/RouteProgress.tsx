import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

/**
 * Thin indeterminate progress bar pinned to the very top of the viewport.
 * Reflects TanStack Router's pending state so every navigation gives immediate
 * feedback even before the (blocking) route loaders resolve. A short trailing
 * delay on completion avoids a flicker on fast transitions.
 */
export function RouteProgress() {
  const isLoading = useRouterState({ select: (s) => s.status === "pending" });
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setVisible(true);
    } else if (visible) {
      // Let the bar reach the end, then fade out.
      hideTimer.current = setTimeout(() => setVisible(false), 280);
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [isLoading, visible]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[150] h-0.5 overflow-hidden transition-opacity duration-200 ${
        isLoading ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="route-progress-slide h-full w-full"
        style={{ background: "var(--gradient-brand)" }}
      />
    </div>
  );
}
