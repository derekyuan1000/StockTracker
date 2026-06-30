import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { addCashFlow, deleteCashFlow, getCashFlows, setCashBalance } from "@/fns/holdings";
import { fmtGBP } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/cash")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData({
      queryKey: ["cash-flows"],
      queryFn: () => getCashFlows(),
    }),
  head: () => ({
    meta: [
      { title: "Cash — StockTracker" },
      { name: "description", content: "Manage cash deposits and withdrawals." },
    ],
  }),
  component: CashPage,
});

type Flow = Awaited<ReturnType<typeof getCashFlows>>["flows"][number];

function CashPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["cash-flows"],
    queryFn: () => getCashFlows(),
  });

  const flows = data?.flows ?? [];
  const cashGBP = data?.cashGBP ?? 0;

  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [setBalanceOpen, setSetBalanceOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Flow | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["cash-flows"] });
    queryClient.invalidateQueries({ queryKey: ["portfolio"] });
  };

  const totalDeposited = flows
    .filter((f) => f.type === "deposit")
    .reduce((s, f) => s + f.amountGBP, 0);
  const totalWithdrawn = flows
    .filter((f) => f.type === "withdrawal")
    .reduce((s, f) => s + f.amountGBP, 0);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-strong">Cash Flow</h1>
        <p className="mt-1 text-sm text-text-muted">
          Track deposits and withdrawals; balance feeds into portfolio totals.
        </p>
      </div>

      {/* Balance + summary strip */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Cash balance hero */}
        <div
          className="rounded-xl border bg-surface p-6"
          style={{ borderColor: cashGBP >= 0 ? "#0ecb81" : "#f6465d" }}
        >
          <div className="text-[11px] uppercase tracking-wider text-text-muted">Available cash</div>
          <div
            className={`num mt-2 text-4xl font-bold ${cashGBP >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]"}`}
          >
            {fmtGBP(cashGBP)}
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 border border-[#0ecb81]/30 bg-[#0ecb81]/10 text-[#0ecb81] hover:bg-[#0ecb81]/20"
              onClick={() => setDepositOpen(true)}
            >
              <ArrowDownCircle className="mr-1.5 h-4 w-4" />
              Deposit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 border border-[#f6465d]/30 bg-[#f6465d]/10 text-[#f6465d] hover:bg-[#f6465d]/20"
              onClick={() => setWithdrawOpen(true)}
            >
              <ArrowUpCircle className="mr-1.5 h-4 w-4" />
              Withdraw
            </Button>
          </div>
          <button
            onClick={() => setSetBalanceOpen(true)}
            className="mt-2 w-full text-center text-[11px] text-text-muted underline-offset-2 hover:text-text-body hover:underline"
          >
            Set balance manually
          </button>
        </div>

        {/* Total deposited */}
        <div className="rounded-xl border border-hairline bg-surface p-6">
          <div className="text-[11px] uppercase tracking-wider text-text-muted">
            Total deposited
          </div>
          <div className="num mt-2 text-2xl font-semibold text-[#0ecb81]">
            {fmtGBP(totalDeposited)}
          </div>
          <div className="mt-1 text-xs text-text-muted">
            {flows.filter((f) => f.type === "deposit").length} transaction
            {flows.filter((f) => f.type === "deposit").length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Total withdrawn */}
        <div className="rounded-xl border border-hairline bg-surface p-6">
          <div className="text-[11px] uppercase tracking-wider text-text-muted">
            Total withdrawn
          </div>
          <div className="num mt-2 text-2xl font-semibold text-[#f6465d]">
            {fmtGBP(totalWithdrawn)}
          </div>
          <div className="mt-1 text-xs text-text-muted">
            {flows.filter((f) => f.type === "withdrawal").length} transaction
            {flows.filter((f) => f.type === "withdrawal").length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Transaction history table */}
      <section className="overflow-x-auto rounded-xl border border-hairline bg-surface">
        <div className="flex items-center justify-between border-b border-hairline px-6 py-3">
          <span className="text-sm font-semibold text-text-strong">Transaction history</span>
          <span className="text-xs text-text-muted">{flows.length} entries</span>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-text-muted">
              <th className="px-6 py-3 text-left font-medium">Date</th>
              <th className="px-3 py-3 text-left font-medium">Type</th>
              <th className="px-3 py-3 text-right font-medium">Amount</th>
              <th className="px-3 py-3 text-left font-medium">Note</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {flows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-text-muted">
                  No transactions yet. Use Deposit or Withdraw to get started.
                </td>
              </tr>
            )}
            {flows.map((f) => (
              <tr
                key={f.id}
                className="border-t border-hairline hover:bg-[var(--surface-elevated)]/40"
              >
                <td className="px-6 py-3 font-mono text-xs text-text-muted">{f.date}</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      f.type === "deposit"
                        ? "bg-[#0ecb81]/15 text-[#0ecb81]"
                        : "bg-[#f6465d]/15 text-[#f6465d]"
                    }`}
                  >
                    {f.type}
                  </span>
                </td>
                <td
                  className={`num px-3 py-3 text-right font-semibold ${
                    f.type === "deposit" ? "text-[#0ecb81]" : "text-[#f6465d]"
                  }`}
                >
                  {f.type === "deposit" ? "+" : "-"}
                  {fmtGBP(f.amountGBP)}
                </td>
                <td className="max-w-[260px] truncate px-3 py-3 text-text-muted">
                  {f.note || <span className="opacity-40">—</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    title="Delete"
                    className="ml-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#f6465d] opacity-60 transition-all hover:bg-[#f6465d]/10 hover:opacity-100"
                    onClick={() => setDeleteTarget(f)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <CashFlowDialog
        open={depositOpen}
        type="deposit"
        onClose={() => setDepositOpen(false)}
        onSuccess={refresh}
      />
      <CashFlowDialog
        open={withdrawOpen}
        type="withdrawal"
        onClose={() => setWithdrawOpen(false)}
        onSuccess={refresh}
      />
      <DeleteFlowDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={refresh}
      />
      <SetBalanceDialog
        open={setBalanceOpen}
        currentBalance={cashGBP}
        onClose={() => setSetBalanceOpen(false)}
        onSuccess={refresh}
      />
    </AppShell>
  );
}

// ─── Deposit / Withdraw dialog ────────────────────────────────────────────────

function CashFlowDialog({
  open,
  type,
  onClose,
  onSuccess,
}: {
  open: boolean;
  type: "deposit" | "withdrawal";
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: (vars: {
      type: "deposit" | "withdrawal";
      amountGBP: number;
      note: string;
      date: string;
    }) => addCashFlow({ data: vars }),
    onSuccess: () => {
      onSuccess();
      handleClose();
    },
    onError: () => setError("Failed to save. Please try again."),
  });

  const reset = () => {
    setAmount("");
    setNote("");
    setDate(new Date().toISOString().split("T")[0]);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    const a = parseFloat(amount);
    if (!isFinite(a) || a <= 0) {
      setError("Enter a valid positive amount.");
      return;
    }
    if (!date) {
      setError("Enter a valid date.");
      return;
    }
    setError("");
    mutate({ type, amountGBP: a, note: note.trim(), date });
  };

  const isDeposit = type === "deposit";
  const accent = isDeposit ? "#0ecb81" : "#f6465d";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm border-hairline bg-[var(--surface)] text-text-strong">
        <DialogHeader>
          <DialogTitle style={{ color: accent }}>
            {isDeposit ? "Deposit cash" : "Withdraw cash"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Amount (£)</label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 500.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border-hairline bg-canvas text-text-strong"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-hairline bg-canvas text-text-strong"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Note <span className="text-text-muted/60">(optional)</span>
            </label>
            <Input
              placeholder="e.g. Monthly savings"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="border-hairline bg-canvas text-text-strong"
            />
          </div>
          {error && <p className="text-xs text-[#f6465d]">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            className="text-text-muted"
            onClick={handleClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            style={{ backgroundColor: accent, color: "#0b0e11" }}
          >
            {isPending ? "Saving…" : isDeposit ? "Deposit" : "Withdraw"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Set balance dialog ───────────────────────────────────────────────────────

function SetBalanceDialog({
  open,
  currentBalance,
  onClose,
  onSuccess,
}: {
  open: boolean;
  currentBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(currentBalance.toFixed(2));
  const [error, setError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: (amountGBP: number) => setCashBalance({ data: { amountGBP } }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: () => setError("Failed to update balance."),
  });

  const handleSubmit = () => {
    const a = parseFloat(amount);
    if (!isFinite(a)) {
      setError("Enter a valid amount.");
      return;
    }
    setError("");
    mutate(a);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm border-hairline bg-[var(--surface)] text-text-strong">
        <DialogHeader>
          <DialogTitle>Set cash balance</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-text-muted">
          Override the current balance directly. Use this to correct the balance after importing
          historical holdings.
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              New balance (£)
            </label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border-hairline bg-canvas text-text-strong"
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-[#f6465d]">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            className="text-text-muted"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : "Set balance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete confirmation dialog ───────────────────────────────────────────────

function DeleteFlowDialog({
  target,
  onClose,
  onDeleted,
}: {
  target: Flow | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { mutate, isPending } = useMutation({
    mutationFn: (id: number) => deleteCashFlow({ data: { id } }),
    onSuccess: () => {
      onDeleted();
      onClose();
    },
  });

  return (
    <AlertDialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="border-hairline bg-[var(--surface)] text-text-strong">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
          <AlertDialogDescription className="text-text-muted">
            This will reverse the{" "}
            <span className="font-semibold text-text-strong">
              {target ? fmtGBP(target.amountGBP) : ""}
            </span>{" "}
            {target?.type} from{" "}
            <span className="font-semibold text-text-strong">{target?.date}</span> and update your
            cash balance.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onClose}
            className="border-hairline bg-transparent text-text-muted hover:bg-canvas sm:mt-0"
          >
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => target && mutate(target.id)}
            disabled={isPending}
          >
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
