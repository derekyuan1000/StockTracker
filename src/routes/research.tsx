import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AppShell } from "@/components/AppShell";
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
  Researching: "#fcd535",
  Bought: "#0ecb81",
  Passed: "#707a8a",
};

const SUGGESTED_SECTORS = [
  "Software",
  "Medtech",
  "Consumer",
  "Industrial",
  "Financial",
  "Contrarian",
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
      <h1 className="mb-1 text-2xl font-semibold text-text-strong">Research</h1>
      <p className="mb-6 text-sm text-text-muted">
        Six weekly active picks — from pipeline to position.
      </p>

      {/* Timeline */}
      <div className="mb-6 rounded-xl border border-hairline bg-surface p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          6-week timeline
        </h3>
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
                    style={{ background: STATUS_COLORS[p.status] ?? "#929aa5" }}
                  />
                  <span className="text-text-muted">{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-x-auto rounded-xl border border-hairline bg-surface">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-text-muted">
                <Th className="text-left pl-6">#</Th>
                <Th className="text-left">Company</Th>
                <Th className="text-left">Ticker</Th>
                <Th className="text-left">Sector</Th>
                <Th className="text-left">Moat</Th>
                <Th>ROIC</Th>
                <Th>P/E</Th>
                <Th>FCF+</Th>
                <Th>Debt&lt;2x</Th>
                <Th className="text-left">Status</Th>
                <Th className="pr-6">Added</Th>
              </tr>
            </thead>
            <tbody>
              {picks.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-10 text-center text-sm text-text-muted">
                    No research picks yet.
                  </td>
                </tr>
              )}
              {picks.map((p) => (
                <>
                  <tr
                    key={p.id}
                    className="cursor-pointer border-t border-hairline transition-colors hover:bg-[var(--surface-elevated)]/40"
                    onClick={() => setOpenRow(openRow === p.id ? null : p.id)}
                  >
                    <Td className="pl-6 text-text-muted num">{p.week}</Td>
                    <Td className="text-text-strong">{p.company}</Td>
                    <Td className="num text-text-muted-strong">{p.ticker}</Td>
                    <Td className="text-text-muted-strong">{p.sector}</Td>
                    <Td className="max-w-[200px] truncate text-text-muted-strong">{p.moat}</Td>
                    <TdNum>{p.roic}%</TdNum>
                    <TdNum>{p.pe.toFixed(1)}</TdNum>
                    <TdNum className={p.fcfPositive ? "text-[var(--up)]" : "text-[var(--down)]"}>
                      {p.fcfPositive ? "✓" : "✗"}
                    </TdNum>
                    <TdNum className={p.lowDebt ? "text-[var(--up)]" : "text-[var(--down)]"}>
                      {p.lowDebt ? "✓" : "✗"}
                    </TdNum>
                    <Td>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          background: `${STATUS_COLORS[p.status] ?? "#929aa5"}22`,
                          color: STATUS_COLORS[p.status] ?? "#929aa5",
                        }}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: STATUS_COLORS[p.status] ?? "#929aa5" }}
                        />
                        {p.status}
                      </span>
                    </Td>
                    <Td className="num pr-6 text-text-muted">{p.addedDate}</Td>
                  </tr>
                  {openRow === p.id && (
                    <tr className="border-t border-hairline bg-canvas">
                      <td colSpan={11} className="px-6 py-5">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_360px]">
                          <div>
                            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                              Research checklist
                            </h4>
                            <ul className="space-y-2">
                              {CHECKLIST.map((item, i) => (
                                <li key={i}>
                                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={checks[p.id]?.[i] ?? false}
                                      onChange={(e) => handleCheck(p.id, i, e.target.checked)}
                                      className="size-4 rounded border-hairline bg-[var(--surface-elevated)] accent-[var(--primary)]"
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
                            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                              Thesis
                            </h4>
                            <p className="text-sm text-text-body">{p.thesis}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-hairline bg-surface p-5">
          <h3 className="mb-1 text-sm font-semibold text-text-strong">Sector coverage</h3>
          <p className="text-[11px] text-text-muted">Suggested spread vs your 6 picks.</p>
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
                  stroke="#0b0e11"
                  strokeWidth={2}
                >
                  {sectorCoverage.map((s, i) => (
                    <Cell
                      key={s.name}
                      fill={
                        s.value > 0
                          ? ["#fcd535", "#2dbdb6", "#3b82f6", "#0ecb81", "#f6465d", "#8b5cf6"][
                              i % 6
                            ]
                          : "#2b3139"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#2b3139",
                    border: "1px solid #3a4049",
                    borderRadius: 6,
                    fontSize: 12,
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
                    background: ["#fcd535", "#2dbdb6", "#3b82f6", "#0ecb81", "#f6465d", "#8b5cf6"][
                      i % 6
                    ],
                    opacity: s.value > 0 ? 1 : 0.25,
                  }}
                />
                <span className={s.value > 0 ? "text-text-body" : "text-text-muted"}>{s.name}</span>
                <span className="num ml-auto text-text-muted">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </AppShell>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-3 text-right font-medium ${className}`}>{children}</th>;
}
function Td({
  children,
  className = "",
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`px-3 py-3 text-left ${className}`}>
      {children}
    </td>
  );
}
function TdNum({
  children,
  className = "",
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`num px-3 py-3 text-right ${className}`}>
      {children}
    </td>
  );
}
