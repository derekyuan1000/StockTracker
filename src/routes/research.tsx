import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AppShell } from "@/components/AppShell";
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
import { listResearchPicks, setChecklist as setChecklistFn } from "@/fns/research";

export const Route = createFileRoute("/research")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData({
      queryKey: ["research-picks"],
      queryFn: () => listResearchPicks(),
    }),
  head: () => ({
    meta: [
      { title: "Research — StockTracker" },
      {
        name: "description",
        content: "Weekly active picks pipeline, checklists and sector coverage.",
      },
    ],
  }),
  component: ResearchPage,
});

const CHECKLIST = [
  "Moat identified",
  "ROIC > 15% confirmed",
  "FCF positive and growing (5-year trend)",
  "Net debt/EBITDA < 2x",
  "P/E below sector average (or justified)",
  "One-sentence thesis written",
  "Bear case documented",
];

const STATUS_COLORS: Record<string, string> = {
  Researching: "var(--brand-periwinkle)",
  Bought: "var(--up)",
  Passed: "var(--text-muted)",
};

const SUGGESTED_SECTORS = [
  "Software",
  "Medtech",
  "Consumer",
  "Industrial",
  "Financial",
  "Contrarian",
];

const SECTOR_PALETTE = [
  "var(--brand-periwinkle)",
  "#2dbdb6",
  "#3b82f6",
  "var(--up)",
  "var(--down)",
  "#8b5cf6",
];

function ResearchPage() {
  const { data: picks = [] } = useQuery({
    queryKey: ["research-picks"],
    queryFn: () => listResearchPicks(),
  });

  const [openRow, setOpenRow] = useState<number | null>(null);
  const [checks, setChecks] = useState<Record<number, boolean[]>>({});

  useEffect(() => {
    setChecks((prev) => {
      const next: Record<number, boolean[]> = {};
      for (const p of picks) {
        next[p.id] =
          prev[p.id] ??
          (p.checklist?.length === CHECKLIST.length
            ? (p.checklist as boolean[])
            : Array(CHECKLIST.length).fill(false));
      }
      return next;
    });
  }, [picks]);

  const { mutate: persistChecklist } = useMutation({
    mutationFn: ({ id, checklist }: { id: number; checklist: boolean[] }) =>
      setChecklistFn({ data: { id, checklist } }),
  });

  function handleCheck(pickId: number, idx: number, checked: boolean) {
    const current = checks[pickId] ?? Array(CHECKLIST.length).fill(false);
    const updated = current.map((v: boolean, i: number) => (i === idx ? checked : v));
    setChecks((c) => ({ ...c, [pickId]: updated }));
    persistChecklist({ id: pickId, checklist: updated });
  }

  const sectorCoverage = useMemo(() => {
    return SUGGESTED_SECTORS.map((s) => ({
      name: s,
      value: picks.filter((p) => p.sector === s).length,
    }));
  }, [picks]);

  return (
    <AppShell>
      {/* Dark band header */}
      <div className="-mx-6 -mt-8 mb-8 bg-[var(--canvas-dark)] px-8 py-16 text-[var(--on-dark)]">
        <p className="eyebrow text-[var(--accent-mint)]">Market Research</p>
        <h1 className="mt-3 text-4xl font-medium tracking-[-0.02em]">Research</h1>
        <p className="mt-3 max-w-xl text-[15px] text-white/60">
          Six weekly active picks — from pipeline to position, with a rigorous checklist
          gating every buy decision.
        </p>
      </div>

      {/* Timeline */}
      <Card className="mb-6 p-5">
        <h3 className="eyebrow mb-3 text-text-muted">6-week timeline</h3>
        {picks.length === 0 ? (
          <p className="text-sm text-text-muted">No research picks yet.</p>
        ) : (
          <div className="flex gap-2">
            {picks.map((p) => (
              <div key={p.id} className="flex-1 rounded-md border border-hairline px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-text-muted">
                  Week {p.week}
                </div>
                <div className="num mt-1 text-sm font-semibold text-text-strong">{p.ticker}</div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: STATUS_COLORS[p.status] ?? "var(--text-muted)" }}
                  />
                  <span className="text-text-muted">{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">#</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Ticker</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Moat</TableHead>
                <TableHead className="text-right">ROIC</TableHead>
                <TableHead className="text-right">P/E</TableHead>
                <TableHead className="text-right">FCF+</TableHead>
                <TableHead className="text-right">Debt&lt;2x</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 text-right">Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {picks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="px-6 py-10 text-center text-text-muted">
                    No research picks yet.
                  </TableCell>
                </TableRow>
              )}
              {picks.map((p) => (
                <Fragment key={p.id}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => setOpenRow(openRow === p.id ? null : p.id)}
                  >
                    <TableNumericCell className="pl-6 text-left text-text-muted">
                      {p.week}
                    </TableNumericCell>
                    <TableCell className="text-text-strong">{p.company}</TableCell>
                    <TableCell className="font-mono uppercase text-text-muted-strong">
                      {p.ticker}
                    </TableCell>
                    <TableCell className="text-text-muted-strong">{p.sector}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-text-muted-strong">
                      {p.moat}
                    </TableCell>
                    <TableNumericCell>{p.roic}%</TableNumericCell>
                    <TableNumericCell>{p.pe.toFixed(1)}</TableNumericCell>
                    <TableNumericCell
                      className={p.fcfPositive ? "text-[var(--up)]" : "text-[var(--down)]"}
                    >
                      {p.fcfPositive ? "✓" : "✗"}
                    </TableNumericCell>
                    <TableNumericCell
                      className={p.lowDebt ? "text-[var(--up)]" : "text-[var(--down)]"}
                    >
                      {p.lowDebt ? "✓" : "✗"}
                    </TableNumericCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em]"
                        style={{
                          background: `color-mix(in srgb, ${STATUS_COLORS[p.status] ?? "var(--text-muted)"} 14%, transparent)`,
                          color: STATUS_COLORS[p.status] ?? "var(--text-muted)",
                        }}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: STATUS_COLORS[p.status] ?? "var(--text-muted)" }}
                        />
                        {p.status}
                      </span>
                    </TableCell>
                    <TableNumericCell className="pr-6 text-text-muted">
                      {p.addedDate}
                    </TableNumericCell>
                  </TableRow>
                  {openRow === p.id && (
                    <TableRow className="bg-[var(--surface-elevated)] hover:bg-[var(--surface-elevated)]">
                      <TableCell colSpan={11} className="px-6 py-5">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_360px]">
                          <div>
                            <h4 className="eyebrow mb-3 text-text-muted">Research checklist</h4>
                            <ul className="space-y-2">
                              {CHECKLIST.map((item, i) => (
                                <li key={i}>
                                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={checks[p.id]?.[i] ?? false}
                                      onChange={(e) => handleCheck(p.id, i, e.target.checked)}
                                      className="size-4 rounded-xs border-hairline bg-[var(--surface-elevated)] accent-[var(--primary)]"
                                    />
                                    <span
                                      className={
                                        checks[p.id]?.[i]
                                          ? "text-text-body line-through opacity-60"
                                          : "text-text-body"
                                      }
                                    >
                                      {item}
                                    </span>
                                  </label>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="eyebrow mb-3 text-text-muted">Thesis</h4>
                            <p className="text-sm text-text-body">{p.thesis}</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-5">
          <h3 className="eyebrow text-text-muted">Sector coverage</h3>
          <p className="mt-1 text-[11px] text-text-muted">Suggested spread vs your 6 picks.</p>
          <div className="mt-3 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectorCoverage.map((s) => ({ ...s, value: Math.max(s.value, 0.0001) }))}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={42}
                  outerRadius={78}
                  paddingAngle={2}
                  stroke="var(--canvas-dark)"
                  strokeWidth={2}
                >
                  {sectorCoverage.map((s, i) => (
                    <Cell
                      key={s.name}
                      fill={s.value > 0 ? SECTOR_PALETTE[i % 6] : "var(--surface-elevated)"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--canvas-dark)",
                    border: "1px solid var(--hairline)",
                    borderRadius: 4,
                    fontSize: 12,
                    color: "var(--on-dark)",
                  }}
                  formatter={(v: number, _n, item) => [
                    `${Math.round(v)} pick${v === 1 ? "" : "s"}`,
                    item?.payload?.name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5 text-[11px]">
            {sectorCoverage.map((s, i) => (
              <li key={s.name} className="flex items-center gap-2">
                <span
                  className="size-2 rounded-sm"
                  style={{
                    background: SECTOR_PALETTE[i % 6],
                    opacity: s.value > 0 ? 1 : 0.25,
                  }}
                />
                <span className={s.value > 0 ? "text-text-body" : "text-text-muted"}>{s.name}</span>
                <span className="num ml-auto text-text-muted">{s.value}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </AppShell>
  );
}

