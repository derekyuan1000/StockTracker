import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { addCashFlow, deleteCashFlow, getCashFlows, setCashBalance } from "@/fns/holdings";
import { fmtGBP } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableNumericCell,
} from "@/components/ui/table";
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
      {/* Page header */}
      <div className="mb-8">
        <p className="eyebrow text-text-muted">Cash Account</p>
        <h1 className="mt-2 text-4xl font-medium tracking-[-0.02em] text-text-strong">Cash</h1>
        <p className="mt-2 text-[15px] text-text-muted">
          Track deposits and withdrawals; balance feeds into portfolio totals.
        </p>
      </div>

      {/* Balance stat block — dark band */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-sm bg-[var(--canvas-dark)] px-8 py-8 text-[var(--on-dark)]">
          <p className="eyebrow text-[var(--accent-mint)]">Available Balance</p>
          <div
            className={`num mt-3 text-5xl font-medium tracking-[-0.02em] ${
              cashGBP >= 0 ? "text-[var(--on-dark)]" : "text-[var(--down)]"
            }`}
          >
            {fmtGBP(cashGBP)}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button variant="default" onClick={() => setDepositOpen(true)}>
              <ArrowDownCircle className="mr-1.5 h-4 w-4" />
              Deposit
            </Button>
            <Button
              variant="ghost-line"
              className="border-white/25 text-white/80 hover:bg-white/10"
              onClick={() => setWithdrawOpen(true)}
            >
              <ArrowUpCircle className="mr-1.5 h-4 w-4" />
              Withdraw
            </Button>
            <button
              onClick={() => setSetBalanceOpen(true)}
              className="ml-1 font-mono text-[11px] uppercase tracking-[0.08em] text-white/45 transition-colors hover:text-white/80"
            >
              Set manually
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Card className="flex items-center justify-between p-5">
            <div>
              <p className="eyebrow text-text-muted">Total deposited</p>
              <div className="mt-1 text-xs text-text-muted">
                {flows.filter((f) => f.type === "deposit").length} transaction
                {flows.filter((f) => f.type === "deposit").length !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="num text-2xl font-medium text-[var(--up)]">
              {fmtGBP(totalDeposited)}
            </div>
          </Card>
          <Card className="flex items-center justify-between p-5">
            <div>
              <p className="eyebrow text-text-muted">Total withdrawn</p>
              <div className="mt-1 text-xs text-text-muted">
                {flows.filter((f) => f.type === "withdrawal").length} transaction
                {flows.filter((f) => f.type === "withdrawal").length !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="num text-2xl font-medium text-[var(--down)]">
              {fmtGBP(totalWithdrawn)}
            </div>
          </Card>
        </div>
      </div>

      {/* Transaction history table */}
      <Card className="overflow-x-auto">
        <div className="flex items-center justify-between border-b border-hairline px-6 py-3">
          <span className="eyebrow text-text-muted">Transaction history</span>
          <span className="num text-xs text-text-muted">{flows.length} entries</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="px-6 py-10 text-center text-text-muted">
                  No transactions yet. Use Deposit or Withdraw to get started.
                </TableCell>
              </TableRow>
            )}
            {flows.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="pl-6 font-mono text-xs text-text-muted">{f.date}</TableCell>
                <TableCell>
                  <span
                    className={`inline-block rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${
                      f.type === "deposit"
                        ? "bg-[var(--up)]/10 text-[var(--up)]"
                        : "bg-[var(--down)]/10 text-[var(--down)]"
                    }`}
                  >
                    {f.type}
                  </span>
                </TableCell>
                <TableNumericCell
                  className={`font-medium ${
                    f.type === "deposit" ? "text-[var(--up)]" : "text-[var(--down)]"
                  }`}
                >
                  {f.type === "deposit" ? "+" : "-"}
                  {fmtGBP(f.amountGBP)}
                </TableNumericCell>
                <TableCell className="max-w-[260px] truncate text-text-muted">
                  {f.note || <span className="opacity-40">—</span>}
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <button
                    title="Delete"
                    className="ml-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-[var(--down)] opacity-60 transition-all hover:bg-[var(--down)]/10 hover:opacity-100"
                    onClick={() => setDeleteTarget(f)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

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
  const accent = isDeposit ? "var(--up)" : "var(--down)";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm border-hairline bg-[var(--surface-card)] text-text-strong">
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
          {error && <p className="text-xs text-[var(--down)]">{error}</p>}
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
            style={{ backgroundColor: accent, color: "var(--canvas-dark)" }}
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
      <DialogContent className="max-w-sm border-hairline bg-[var(--surface-card)] text-text-strong">
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
          {error && <p className="text-xs text-[var(--down)]">{error}</p>}
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
      <AlertDialogContent className="border-hairline bg-[var(--surface-card)] text-text-strong">
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
