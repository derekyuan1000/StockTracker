import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  Loader2,
  Lock,
  PlusCircle,
  Trash2,
  Unlock,
  Upload,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  addCashFlow,
  addHolding,
  addTrade,
  deleteCashFlow,
  deleteLot,
  deleteTrade,
  getCashFlows,
  getPriceForDate,
  getTrades,
  getTransactions,
  searchTicker,
  sellUnits,
  setCashBalance,
  updateCash,
  updateLot,
} from "@/fns/holdings";
import { dirClass, fmtGBP, fmtGBPSigned, fmtNum } from "@/lib/format";
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

export const Route = createFileRoute("/transactions")({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData({
        queryKey: ["transactions"],
        queryFn: () => getTransactions(),
      }),
      queryClient.ensureQueryData({
        queryKey: ["cash-flows"],
        queryFn: () => getCashFlows(),
      }),
      queryClient.ensureQueryData({
        queryKey: ["trades"],
        queryFn: () => getTrades(),
      }),
    ]),
  head: () => ({
    meta: [
      { title: "Transactions — StockTracker" },
      {
        name: "description",
        content: "Purchase lots and cash flow — add, edit, delete, import or export.",
      },
    ],
  }),
  component: TransactionsPage,
});

type Tx = Awaited<ReturnType<typeof getTransactions>>[number];
type Flow = Awaited<ReturnType<typeof getCashFlows>>["flows"][number];
type CsvRow =
  | { kind: "BUY"; ticker: string; units: number; price: number; date: string }
  | { kind: "SELL"; ticker: string; units: number; price: number; date: string }
  | { kind: "DEPOSIT"; amount: number; date: string }
  | { kind: "FEE"; amount: number; date: string };

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (line[i] === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += line[i];
    }
  }
  result.push(current);
  return result;
}

function parsePortfolioCSV(text: string): { rows: CsvRow[]; skipped: number } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { rows: [], skipped: 0 };

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, ""));
  const col = (name: string) => headers.indexOf(name);

  const symIdx = col("Symbol");
  const typeIdx = col("Transaction Type");
  const dateIdx = col("Trade Date");
  const priceIdx = col("Purchase Price");
  const qtyIdx = col("Quantity");

  const rows: CsvRow[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCsvLine(lines[i]).map((c) => c.trim().replace(/^"|"$/g, ""));

    const ticker = cols[symIdx] ?? "";
    const type = cols[typeIdx] ?? "";
    const rawDate = cols[dateIdx] ?? "";
    const qty = parseFloat(cols[qtyIdx] ?? "");

    if (rawDate.length !== 8 || !isFinite(qty) || qty <= 0) {
      skipped++;
      continue;
    }
    const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;

    if (ticker === "$$CASH_TX") {
      if (type === "DEPOSIT") {
        rows.push({ kind: "DEPOSIT", amount: qty, date });
      } else if (type === "FEE") {
        rows.push({ kind: "FEE", amount: qty, date });
      } else {
        skipped++;
      }
      continue;
    }

    if (type === "BUY") {
      const price = parseFloat(cols[priceIdx] ?? "");
      if (!isFinite(price) || price <= 0) {
        skipped++;
        continue;
      }
      rows.push({ kind: "BUY", ticker, units: qty, price, date });
    } else if (type === "SELL") {
      const sellPrice = parseFloat(cols[priceIdx] ?? "");
      rows.push({
        kind: "SELL",
        ticker,
        units: qty,
        price: isFinite(sellPrice) && sellPrice > 0 ? sellPrice : 0,
        date,
      });
    } else {
      skipped++;
    }
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  return { rows, skipped };
}

function exportCSV(rows: Tx[]) {
  const cols = [
    "Date",
    "Ticker",
    "Company",
    "Units",
    "Buy Price (p)",
    "Cost (£)",
    "Last Price (p)",
    "Value (£)",
    "Gain (£)",
    "Gain (%)",
  ];
  const data = rows.map((r) => [
    r.dateBought,
    r.ticker,
    r.name,
    r.units,
    r.buyPrice.toFixed(2),
    r.costGBP.toFixed(2),
    r.lastPrice > 0 ? r.lastPrice.toFixed(2) : "",
    r.lastPrice > 0 ? r.valueGBP.toFixed(2) : "",
    r.lastPrice > 0 ? r.gainGBP.toFixed(2) : "",
    r.lastPrice > 0 ? r.gainPct.toFixed(2) : "",
  ]);
  const csv = [cols, ...data]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function TransactionsPage() {
  const queryClient = useQueryClient();

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["cash-flows"] });
    queryClient.invalidateQueries({ queryKey: ["trades"] });
    queryClient.invalidateQueries({ queryKey: ["portfolio"] });
  }, [queryClient]);

  return (
    <AppShell>
      <div className="mb-8">
        <p className="eyebrow text-text-muted">Transaction History</p>
        <h1 className="mt-2 text-4xl font-medium tracking-[-0.02em] text-text-strong">
          Transactions
        </h1>
        <p className="mt-2 text-[15px] text-text-muted">
          Manage cash flow and purchase lots in one place.
        </p>
      </div>

      <CashTab refresh={refresh} />

      <div className="mt-10">
        <TransactionsTab refresh={refresh} />
      </div>
    </AppShell>
  );
}

// ─── Transactions tab ─────────────────────────────────────────────────────────

type TradeRow = Awaited<ReturnType<typeof getTrades>>[number];

function TransactionsTab({ refresh }: { refresh: () => void }) {
  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => getTransactions(),
  });

  const { data: cashData } = useQuery({
    queryKey: ["cash-flows"],
    queryFn: () => getCashFlows(),
  });
  const manualFlows = cashData?.flows ?? [];

  const { data: tradeRows = [] } = useQuery({
    queryKey: ["trades"],
    queryFn: () => getTrades(),
  });

  const [deleteTradeTarget, setDeleteTradeTarget] = useState<TradeRow | null>(null);
  const [deleteFlowTarget, setDeleteFlowTarget] = useState<Flow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addCashOpen, setAddCashOpen] = useState(false);
  const [importRows, setImportRows] = useState<CsvRow[] | null>(null);
  const [importSkipped, setImportSkipped] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totals = useMemo(() => {
    const cost = transactions.reduce((s, r) => s + r.costGBP, 0);
    const value = transactions.reduce((s, r) => s + r.valueGBP, 0);
    return { cost, value, gain: value - cost };
  }, [transactions]);

  // Combined view: DB trades (all imported/manual buys, sells, deposits, fees) + manual cash flows
  const combined = useMemo(() => {
    const tradeItems = tradeRows.map((t) => ({
      kind: "trade" as const,
      date: t.date,
      key: `trade-${t.id}`,
      t,
    }));
    const flowItems = manualFlows.map((f) => ({
      kind: "flow" as const,
      date: f.date,
      key: `flow-${f.id}`,
      f,
    }));
    return [...tradeItems, ...flowItems].sort((a, b) => b.date.localeCompare(a.date));
  }, [tradeRows, manualFlows]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, skipped } = parsePortfolioCSV(text);
      setImportSkipped(skipped);
      setImportRows(rows);
    };
    reader.readAsText(file, "utf-8");
  };

  const TYPE_STYLE: Record<TradeRow["type"], { label: string; cls: string }> = {
    buy: { label: "BUY", cls: "bg-[var(--primary)]/15 text-[var(--primary)]" },
    sell: { label: "SELL", cls: "bg-[var(--down)]/15 text-[var(--down)]" },
    deposit: { label: "DEPOSIT", cls: "bg-[var(--up)]/15 text-[var(--up)]" },
    fee: { label: "FEE", cls: "bg-[var(--brand-orange)]/10 text-[var(--brand-orange)]" },
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatCard label="Lots" value={String(transactions.length)} />
          <StatCard label="Total cost" value={fmtGBP(totals.cost)} />
          <StatCard label="Current value" value={fmtGBP(totals.value)} />
          <StatCard label="Total gain" value={fmtGBPSigned(totals.gain)} tone={totals.gain} />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            variant="ghost-line"
            className="border-hairline text-text-muted hover:text-text-strong"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button
            variant="ghost-line"
            className="border-hairline text-text-muted hover:text-text-strong"
            onClick={() => exportCSV(transactions)}
            disabled={transactions.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="ghost-line"
            className="border-hairline text-text-muted hover:text-text-strong"
            onClick={() => setAddCashOpen(true)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Cash
          </Button>
          <Button
            variant="ghost-line"
            className="border-hairline text-text-muted hover:text-text-strong"
            onClick={() => setAddOpen(true)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add holding
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <Card className="overflow-x-auto">
        <div className="flex items-center justify-between border-b border-hairline px-6 py-3">
          <span className="eyebrow text-text-muted">Transaction history</span>
          <span className="num text-xs text-text-muted">{combined.length} entries</span>
        </div>
        <Table className="min-w-[680px]">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Amount (£)</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {combined.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="px-6 py-10 text-center text-text-muted">
                  No transactions yet.
                </TableCell>
              </TableRow>
            )}
            {combined.map((row) => {
              if (row.kind === "flow") {
                const f = row.f;
                const isDeposit = f.type === "deposit";
                return (
                  <TableRow key={row.key}>
                    <TableCell className="pl-6 font-mono text-xs text-text-muted">
                      {f.date}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${
                          isDeposit
                            ? "bg-[var(--up)]/10 text-[var(--up)]"
                            : "bg-[var(--down)]/10 text-[var(--down)]"
                        }`}
                      >
                        {f.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-text-muted">
                      {f.note || <span className="opacity-40">—</span>}
                    </TableCell>
                    <TableNumericCell className="text-text-muted">—</TableNumericCell>
                    <TableNumericCell className="text-text-muted">—</TableNumericCell>
                    <TableNumericCell
                      className={`font-medium ${isDeposit ? "text-[var(--up)]" : "text-[var(--down)]"}`}
                    >
                      {isDeposit ? "+" : "-"}
                      {fmtGBP(f.amountGBP)}
                    </TableNumericCell>
                    <TableCell className="pr-4 text-right">
                      <button
                        title="Delete"
                        className="ml-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-[var(--down)] opacity-60 transition-all hover:bg-[var(--down)]/10 hover:opacity-100"
                        onClick={() => setDeleteFlowTarget(f)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              }

              // Trade row (buy / sell / deposit / fee stored in DB)
              const tx = row.t;
              const style = TYPE_STYLE[tx.type];
              const isBuy = tx.type === "buy";
              const isSell = tx.type === "sell";
              const isStockTx = isBuy || isSell;
              return (
                <TableRow key={row.key}>
                  <TableCell className="pl-6 font-mono text-xs text-text-muted">
                    {tx.date}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${style.cls}`}
                    >
                      {style.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    {isStockTx ? (
                      <>
                        <span className="font-mono font-medium uppercase text-text-strong">
                          {tx.ticker}
                        </span>
                        {tx.name !== tx.ticker && (
                          <span className="ml-2 text-xs text-text-muted">{tx.name}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-text-muted">
                        {tx.type === "deposit" ? "Cash deposit" : "Fee / charge"}
                      </span>
                    )}
                  </TableCell>
                  <TableNumericCell className={isStockTx ? "" : "text-text-muted"}>
                    {isStockTx ? fmtNum(tx.units, 2) : "—"}
                  </TableNumericCell>
                  <TableNumericCell className={isStockTx ? "" : "text-text-muted"}>
                    {isStockTx ? fmtNum(tx.price, 2) : "—"}
                  </TableNumericCell>
                  <TableNumericCell
                    className={`font-medium ${isSell ? "text-[var(--up)]" : isBuy ? "" : tx.type === "deposit" ? "text-[var(--up)]" : "text-[var(--down)]"}`}
                  >
                    {isSell ? "+" : isBuy ? "-" : tx.type === "deposit" ? "+" : "-"}
                    {fmtGBP(tx.amountGBP)}
                  </TableNumericCell>
                  <TableCell className="pr-4 text-right">
                    <button
                      title="Delete"
                      className="ml-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-[var(--down)] opacity-60 transition-all hover:bg-[var(--down)]/10 hover:opacity-100"
                      onClick={() => setDeleteTradeTarget(tx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <AddTransactionDialog open={addOpen} onClose={() => setAddOpen(false)} onSuccess={refresh} />
      <CashFlowDialog
        open={addCashOpen}
        onClose={() => setAddCashOpen(false)}
        onSuccess={refresh}
      />
      <ImportCSVDialog
        rows={importRows}
        skipped={importSkipped}
        onClose={() => setImportRows(null)}
        onSuccess={refresh}
      />
      <DeleteFlowDialog
        target={deleteFlowTarget}
        onClose={() => setDeleteFlowTarget(null)}
        onDeleted={refresh}
      />
      <DeleteTradeDialog
        target={deleteTradeTarget}
        onClose={() => setDeleteTradeTarget(null)}
        onDeleted={refresh}
      />
    </>
  );
}

// ─── Cash tab ─────────────────────────────────────────────────────────────────

function CashTab({ refresh }: { refresh: () => void }) {
  const { data } = useQuery({
    queryKey: ["cash-flows"],
    queryFn: () => getCashFlows(),
  });

  const { data: tradeRows = [] } = useQuery({
    queryKey: ["trades"],
    queryFn: () => getTrades(),
  });

  const flows = data?.flows ?? [];
  const cashGBP = data?.cashGBP ?? 0;

  const [setBalanceOpen, setSetBalanceOpen] = useState(false);

  // Include both manual cash-flow entries and spreadsheet-imported deposit trades
  const depositFlowTotal = flows
    .filter((f) => f.type === "deposit")
    .reduce((s, f) => s + f.amountGBP, 0);
  const depositTradeTotal = tradeRows
    .filter((t) => t.type === "deposit")
    .reduce((s, t) => s + t.amountGBP, 0);
  const totalDeposited = depositFlowTotal + depositTradeTotal;
  const depositCount =
    flows.filter((f) => f.type === "deposit").length +
    tradeRows.filter((t) => t.type === "deposit").length;

  const totalWithdrawn = flows
    .filter((f) => f.type === "withdrawal")
    .reduce((s, f) => s + f.amountGBP, 0);
  const withdrawalCount = flows.filter((f) => f.type === "withdrawal").length;

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          className="rounded-sm border bg-surface p-6"
          style={{ borderColor: cashGBP >= 0 ? "var(--up)" : "var(--down)" }}
        >
          <div className="text-[11px] uppercase tracking-wider text-text-muted">Available cash</div>
          <div
            className={`num mt-2 text-4xl font-medium ${cashGBP >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}`}
          >
            {fmtGBP(cashGBP)}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 w-full justify-start border border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20"
            onClick={() => setSetBalanceOpen(true)}
          >
            Set balance manually
          </Button>
        </div>

        <div className="rounded-sm border border-hairline bg-surface p-6">
          <div className="text-[11px] uppercase tracking-wider text-text-muted">
            Total deposited
          </div>
          <div className="num mt-2 text-2xl font-semibold text-[var(--up)]">
            {fmtGBP(totalDeposited)}
          </div>
          <div className="mt-1 text-xs text-text-muted">
            {depositCount} transaction{depositCount !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="rounded-sm border border-hairline bg-surface p-6">
          <div className="text-[11px] uppercase tracking-wider text-text-muted">
            Total withdrawn
          </div>
          <div className="num mt-2 text-2xl font-semibold text-[var(--down)]">
            {fmtGBP(totalWithdrawn)}
          </div>
          <div className="mt-1 text-xs text-text-muted">
            {withdrawalCount} transaction{withdrawalCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <SetBalanceDialog
        open={setBalanceOpen}
        currentBalance={cashGBP}
        onClose={() => setSetBalanceOpen(false)}
        onSuccess={refresh}
      />
    </>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, tone }: { label: string; value: string; tone?: number }) {
  return (
    <div className="flex h-9 items-center gap-2 rounded-lg border border-hairline bg-surface px-3">
      <span className="text-[10px] uppercase tracking-wider text-text-muted">{label}</span>
      <span
        className={`num text-sm font-semibold ${tone !== undefined ? dirClass(tone) : "text-text-strong"}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Add Transaction dialog ───────────────────────────────────────────────────

function AddTransactionDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tickerRaw, setTickerRaw] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedTicker, setDebouncedTicker] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [units, setUnits] = useState("");
  const [price, setPrice] = useState("");
  const [priceLocked, setPriceLocked] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(tickerRaw.trim()), 280);
    return () => clearTimeout(id);
  }, [tickerRaw]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedTicker(tickerRaw.trim().toUpperCase()), 600);
    return () => clearTimeout(id);
  }, [tickerRaw]);

  const { data: suggestions = [] } = useQuery({
    queryKey: ["ticker-search", debouncedSearch],
    queryFn: () => searchTicker({ data: { query: debouncedSearch } }),
    enabled: debouncedSearch.length >= 1 && showSuggestions,
    staleTime: 30_000,
  });

  const { data: autoPrice, isFetching: priceFetching } = useQuery({
    queryKey: ["price-for-date", debouncedTicker, date],
    queryFn: () => getPriceForDate({ data: { ticker: debouncedTicker, date } }),
    enabled: debouncedTicker.length >= 1 && !!date && !priceLocked,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!priceLocked && autoPrice?.price && autoPrice.price > 0) {
      setPrice(autoPrice.price.toFixed(2));
    }
  }, [autoPrice, priceLocked]);

  const reset = () => {
    setTickerRaw("");
    setDebouncedSearch("");
    setDebouncedTicker("");
    setShowSuggestions(false);
    setUnits("");
    setPrice("");
    setPriceLocked(false);
    setDate(new Date().toISOString().split("T")[0]);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const ticker = tickerRaw.trim().toUpperCase();
    const u = parseFloat(units);
    const p = parseFloat(price);
    if (!ticker || !u || u <= 0 || !p || p <= 0 || !date) {
      setError("Please fill in all fields with valid values.");
      return;
    }
    const isFund = ticker.startsWith("0P");
    const bucket = isFund ? "Fund" : "Stock";
    const amountGBP = isFund ? p * u : (p * u) / 100;
    setLoading(true);
    setError("");
    try {
      await addHolding({
        data: {
          ticker,
          units: u,
          price: p,
          dateBought: date,
          bucket,
          allocTarget: 0,
          deductCash: true,
        },
      });
      onSuccess();
      handleClose();
    } catch {
      setError("Failed to add transaction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
      {children}
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm border-hairline bg-[var(--surface-card)] text-text-strong">
        <DialogHeader>
          <DialogTitle>Add holding</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Ticker + Units row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="relative col-span-2">
              <FieldLabel>Ticker</FieldLabel>
              <Input
                placeholder="e.g. AAPL or search…"
                value={tickerRaw}
                onChange={(e) => {
                  setTickerRaw(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                className="border-hairline bg-canvas text-text-strong"
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-auto rounded-sm border border-[var(--hairline)] bg-[var(--surface-elevated)] py-1">
                  {suggestions.slice(0, 8).map((s) => (
                    <li
                      key={s.ticker}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setTickerRaw(s.ticker);
                        setShowSuggestions(false);
                      }}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-[var(--surface-elevated)]"
                    >
                      <span className="num w-24 shrink-0 text-xs font-semibold text-[var(--primary)]">
                        {s.ticker}
                      </span>
                      <span className="truncate text-xs text-text-muted">{s.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <FieldLabel>Units</FieldLabel>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                className="border-hairline bg-canvas text-text-strong"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <FieldLabel>Date Bought</FieldLabel>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-hairline bg-canvas text-text-strong"
            />
          </div>

          {/* Price */}
          <div>
            <FieldLabel>Price at Purchase</FieldLabel>
            <div className="relative">
              <Input
                type="number"
                min="0"
                step="any"
                placeholder={priceLocked ? "Enter price (pence)" : "Auto-detect"}
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setPriceLocked(true);
                }}
                className={`border bg-canvas pr-9 text-text-strong transition-colors ${
                  priceFetching && !priceLocked
                    ? "border-[var(--primary)]/60"
                    : !priceLocked && autoPrice?.price && autoPrice.price > 0
                      ? "border-[var(--up)]/60"
                      : "border-hairline"
                }`}
              />
              <button
                type="button"
                title={priceLocked ? "Restore auto-detect" : "Enter price manually"}
                onClick={() => setPriceLocked((l) => !l)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-strong"
              >
                {priceFetching && !priceLocked ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
                ) : priceLocked ? (
                  <Unlock className="h-4 w-4 text-[var(--brand-orange)]" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-text-muted">
              {priceFetching && !priceLocked
                ? "Fetching price from Yahoo Finance…"
                : priceLocked
                  ? "Manual — click the unlock icon to restore auto-detect."
                  : !priceLocked && autoPrice?.price && autoPrice.price > 0
                    ? "✓ Price fetched from Yahoo Finance."
                    : "Price will be fetched automatically from Yahoo Finance."}
            </p>
          </div>

          {error && <p className="text-xs text-[var(--down)]">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            className="text-text-muted"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={loading}
            className="active:scale-[0.98]"
          >
            {loading ? "Adding…" : "Add holding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Import CSV dialog ────────────────────────────────────────────────────────

const KIND_STYLE: Record<CsvRow["kind"], { label: string; cls: string }> = {
  BUY: { label: "BUY", cls: "bg-[var(--up)]/15 text-[var(--up)]" },
  SELL: { label: "SELL", cls: "bg-[var(--down)]/15 text-[var(--down)]" },
  DEPOSIT: { label: "DEPOSIT", cls: "bg-[var(--info)]/15 text-[var(--info)]" },
  FEE: { label: "FEE", cls: "bg-[var(--brand-orange)]/10 text-[var(--brand-orange)]" },
};

function ImportCSVDialog({
  rows,
  skipped,
  onClose,
  onSuccess,
}: {
  rows: CsvRow[] | null;
  skipped: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: number } | null>(null);

  useEffect(() => {
    if (!rows) setResult(null);
  }, [rows]);

  const handleImport = async () => {
    if (!rows) return;
    setLoading(true);
    let imported = 0,
      errors = 0;
    for (const row of rows) {
      try {
        if (row.kind === "BUY") {
          const isFund = row.ticker.startsWith("0P");
          await addHolding({
            data: {
              ticker: row.ticker,
              units: row.units,
              price: row.price,
              dateBought: row.date,
              bucket: isFund ? "Fund" : "Stock",
              allocTarget: 0,
              deductCash: true,
            },
          });
        } else if (row.kind === "SELL") {
          const isFund = row.ticker.startsWith("0P");
          const sellPrice = row.price > 0 ? row.price : 1;
          const amountGBP = isFund ? sellPrice * row.units : (sellPrice * row.units) / 100;
          await sellUnits({ data: { ticker: row.ticker, units: row.units, price: sellPrice } });
          await addTrade({
            data: {
              type: "sell",
              ticker: row.ticker,
              units: row.units,
              price: sellPrice,
              amountGBP,
              date: row.date,
            },
          });
        } else if (row.kind === "DEPOSIT") {
          await updateCash({ data: { delta: row.amount } });
          await addTrade({ data: { type: "deposit", amountGBP: row.amount, date: row.date } });
        } else if (row.kind === "FEE") {
          await updateCash({ data: { delta: -row.amount } });
          await addTrade({ data: { type: "fee", amountGBP: row.amount, date: row.date } });
        }
        imported++;
      } catch {
        errors++;
      }
    }
    setResult({ imported, errors });
    setLoading(false);
    onSuccess();
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  const counts = rows
    ? Object.fromEntries(
        (["BUY", "SELL", "DEPOSIT", "FEE"] as const).map((k) => [
          k,
          rows.filter((r) => r.kind === k).length,
        ]),
      )
    : null;

  return (
    <Dialog open={rows !== null} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg border-hairline bg-[var(--surface-card)] text-text-strong">
        <DialogHeader>
          <DialogTitle>Import from CSV</DialogTitle>
        </DialogHeader>
        {result ? (
          <div className="py-2 text-sm text-text-muted">
            <span className="font-semibold text-[var(--up)]">{result.imported}</span> row
            {result.imported !== 1 ? "s" : ""} imported successfully.
            {result.errors > 0 && (
              <>
                {" "}
                <span className="font-semibold text-[var(--down)]">{result.errors}</span> failed.
              </>
            )}
          </div>
        ) : rows && rows.length === 0 ? (
          <p className="py-2 text-sm text-text-muted">
            No valid transactions found in this file.
            {skipped > 0 && ` (${skipped} rows were unrecognised or malformed.)`}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              {(["BUY", "SELL", "DEPOSIT", "FEE"] as const).map((k) =>
                counts && counts[k] > 0 ? (
                  <span
                    key={k}
                    className={`rounded-full px-2.5 py-0.5 font-semibold ${KIND_STYLE[k].cls}`}
                  >
                    {counts[k]} {KIND_STYLE[k].label}
                  </span>
                ) : null,
              )}
              {skipped > 0 && (
                <span className="rounded-full bg-[var(--surface-elevated)] px-2.5 py-0.5 text-text-muted">
                  {skipped} skipped
                </span>
              )}
            </div>
            <div className="max-h-72 overflow-auto rounded-sm border border-hairline">
              <Table>
                <TableHeader className="sticky top-0">
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Ticker / Description</TableHead>
                    <TableHead className="text-right">Units / Amount</TableHead>
                    <TableHead className="text-right">Price (p)</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rows ?? []).map((r, i) => {
                    const style = KIND_STYLE[r.kind];
                    return (
                      <TableRow key={i}>
                        <TableCell>
                          <span
                            className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${style.cls}`}
                          >
                            {style.label}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono font-medium text-[var(--text-strong)]">
                          {r.kind === "BUY" || r.kind === "SELL"
                            ? r.ticker
                            : r.kind === "DEPOSIT"
                              ? "Cash deposit"
                              : "Fee / charge"}
                        </TableCell>
                        <TableNumericCell>
                          {r.kind === "BUY" || r.kind === "SELL"
                            ? r.units
                            : `£${r.amount.toFixed(2)}`}
                        </TableNumericCell>
                        <TableNumericCell className="text-text-muted">
                          {r.kind === "BUY" ? r.price.toFixed(2) : "—"}
                        </TableNumericCell>
                        <TableCell className="text-text-muted">{r.date}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" className="text-text-muted" onClick={handleClose}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (rows?.length ?? 0) > 0 && (
            <Button onClick={handleImport} disabled={loading}>
              {loading
                ? "Importing…"
                : `Import ${rows?.length} row${(rows?.length ?? 0) !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit lot dialog ──────────────────────────────────────────────────────────

function EditLotDialog({
  target,
  onClose,
  onSuccess,
}: {
  target: Tx | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [units, setUnits] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (target) {
      setUnits(String(target.units));
      setPrice(target.buyPrice.toFixed(2));
      setDate(target.dateBought);
      setError("");
    }
  }, [target?.id]);

  const handleSubmit = async () => {
    const u = parseFloat(units);
    const p = parseFloat(price);
    if (!u || u <= 0 || !p || p <= 0 || !date) {
      setError("Please fill in all fields with valid values.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await updateLot({ data: { id: target!.id, units: u, price: p, date } });
      onSuccess();
      onClose();
    } catch {
      setError("Failed to update. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm border-hairline bg-[var(--surface-card)] text-text-strong">
        <DialogHeader>
          <DialogTitle>
            <span className="font-mono">{target?.ticker}</span>
            <span className="ml-2 text-sm font-normal text-text-muted">{target?.name}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Units</label>
            <Input
              type="number"
              min="0"
              step="any"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              className="border-hairline bg-canvas text-text-strong"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Buy price (pence)
            </label>
            <Input
              type="number"
              min="0"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="border-hairline bg-canvas text-text-strong"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Date bought</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-hairline bg-canvas text-text-strong"
            />
          </div>
          {error && <p className="text-xs text-[var(--down)]">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" className="text-text-muted" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete lot dialog ────────────────────────────────────────────────────────

function DeleteLotDialog({
  target,
  onClose,
  onDeleted,
}: {
  target: Tx | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!target) return;
    setLoading(true);
    try {
      await deleteLot({ data: { id: target.id } });
      onDeleted();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="border-hairline bg-[var(--surface-card)] text-text-strong">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this lot?</AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed text-text-muted">
            <span className="font-semibold text-text-strong">
              {target ? fmtNum(target.units, 2) : ""} units
            </span>{" "}
            of <span className="font-semibold text-text-strong">{target?.ticker}</span> bought on{" "}
            <span className="font-semibold text-text-strong">{target?.dateBought}</span> for{" "}
            <span className="font-semibold text-text-strong">
              {target ? fmtGBP(target.costGBP) : ""}
            </span>
            .
            <br />
            <br />
            If this is the last lot for this holding, the holding will also be removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onClose}
            className="border-hairline bg-transparent text-text-muted hover:bg-canvas sm:mt-0"
          >
            Cancel
          </AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting…" : "Delete lot"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Cash flow dialog ─────────────────────────────────────────────────────────

function CashFlowDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [type, setType] = useState<"deposit" | "withdrawal">("deposit");
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
    setType("deposit");
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
          <DialogTitle>Add Cash</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex rounded-lg border border-hairline p-1">
            <button
              type="button"
              onClick={() => setType("deposit")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all ${
                isDeposit
                  ? "bg-[var(--up)]/15 text-[var(--up)]"
                  : "text-text-muted hover:text-text-body"
              }`}
            >
              <ArrowDownCircle className="h-3.5 w-3.5" />
              Deposit
            </button>
            <button
              type="button"
              onClick={() => setType("withdrawal")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all ${
                !isDeposit
                  ? "bg-[var(--down)]/15 text-[var(--down)]"
                  : "text-text-muted hover:text-text-body"
              }`}
            >
              <ArrowUpCircle className="h-3.5 w-3.5" />
              Withdraw
            </button>
          </div>
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

// ─── Delete cash flow dialog ──────────────────────────────────────────────────

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

// ─── Delete trade dialog ──────────────────────────────────────────────────────

function DeleteTradeDialog({
  target,
  onClose,
  onDeleted,
}: {
  target: TradeRow | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { mutate, isPending } = useMutation({
    mutationFn: (id: number) => deleteTrade({ data: { id } }),
    onSuccess: () => {
      onDeleted();
      onClose();
    },
  });

  return (
    <AlertDialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="border-hairline bg-[var(--surface-card)] text-text-strong">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this record?</AlertDialogTitle>
          <AlertDialogDescription className="text-text-muted">
            Remove the{" "}
            <span className="font-semibold text-text-strong uppercase">{target?.type}</span> of{" "}
            <span className="font-semibold text-text-strong">{fmtGBP(target?.amountGBP ?? 0)}</span>{" "}
            on <span className="font-semibold text-text-strong">{target?.date}</span> from the
            transaction history.
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
