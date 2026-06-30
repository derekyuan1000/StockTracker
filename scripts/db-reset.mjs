const url = `${process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, "https://")}/v2/pipeline`;
const token = process.env.TURSO_AUTH_TOKEN;

const res = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    requests: [
      { type: "execute", stmt: { sql: "DELETE FROM cash_flows" } },
      { type: "execute", stmt: { sql: "DELETE FROM trades" } },
      { type: "execute", stmt: { sql: "DELETE FROM research_picks" } },
      { type: "execute", stmt: { sql: "DELETE FROM lots" } },
      { type: "execute", stmt: { sql: "DELETE FROM holdings" } },
      { type: "execute", stmt: { sql: "DELETE FROM portfolio_meta" } },
      { type: "execute", stmt: { sql: "DELETE FROM quote_cache" } },
      { type: "close" },
    ],
  }),
});

const data = await res.json();
const [cashFlows, lots, holdings, meta, cache] = data.results
  .slice(0, 5)
  .map(r => r.response?.result?.affected_row_count ?? 0);
console.log(
  `Deleted: ${lots} lots, ${holdings} holdings, ${meta} portfolio_meta rows, ${cashFlows} cash_flows, ${cache} quote_cache entries`,
);
