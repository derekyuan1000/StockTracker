import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAlerts, createAlert, deleteAlert } from "@/fns/alerts";

export function PriceAlertDialog({
  ticker,
  lastPrice,
  currency,
}: {
  ticker: string;
  lastPrice: number;
  currency: "GBp" | "GBP";
}) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [target, setTarget] = useState("");
  const qc = useQueryClient();

  const { data: allAlerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => getAlerts(),
    enabled: open,
  });

  const tickerAlerts = allAlerts.filter((a) => a.ticker === ticker && a.active);

  const add = useMutation({
    mutationFn: () => createAlert({ data: { ticker, direction, targetPrice: parseFloat(target) } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      setTarget("");
      toast.success("Alert created");
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteAlert({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alert removed");
    },
  });

  const unitLabel = currency === "GBp" ? "p" : "£";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Bell className="size-3.5" />
          Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Price Alerts — {ticker}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-text-muted">
          Current: {unitLabel}
          {lastPrice.toFixed(currency === "GBp" ? 0 : 2)}
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            {(["above", "below"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className={`flex-1 rounded-sm border py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                  direction === d
                    ? "border-[var(--brand-periwinkle)] bg-[var(--brand-periwinkle)]/10 text-text-strong"
                    : "border-hairline text-text-muted hover:border-text-muted"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                {unitLabel}
              </span>
              <Input
                type="number"
                placeholder="Target price"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="pl-7"
              />
            </div>
            <Button
              onClick={() => add.mutate()}
              disabled={!target || isNaN(parseFloat(target)) || add.isPending}
              size="sm"
            >
              Add
            </Button>
          </div>
        </div>

        {tickerAlerts.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              Active alerts
            </p>
            {tickerAlerts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-sm border border-hairline px-3 py-2 text-sm"
              >
                <span className="text-text-body">
                  {a.direction === "above" ? "↑" : "↓"} {unitLabel}
                  {a.targetPrice.toFixed(currency === "GBp" ? 0 : 2)}
                </span>
                <button
                  onClick={() => remove.mutate(a.id)}
                  className="text-text-muted hover:text-[var(--down)]"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
