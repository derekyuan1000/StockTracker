const url = `${process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, "https://")}/v2/pipeline`;
const token = process.env.TURSO_AUTH_TOKEN;

const res = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    requests: [
      // App data (child tables first)
      { type: "execute", stmt: { sql: "DELETE FROM cash_flows" } },
      { type: "execute", stmt: { sql: "DELETE FROM trades" } },
      { type: "execute", stmt: { sql: "DELETE FROM research_picks" } },
      { type: "execute", stmt: { sql: "DELETE FROM lots" } },
      { type: "execute", stmt: { sql: "DELETE FROM holdings" } },
      { type: "execute", stmt: { sql: "DELETE FROM portfolio_meta" } },
      { type: "execute", stmt: { sql: "DELETE FROM quote_cache" } },
      { type: "execute", stmt: { sql: "DELETE FROM user_settings" } },
      // Auth tables (session/account cascade from user, but delete explicitly)
      { type: "execute", stmt: { sql: "DELETE FROM verification" } },
      { type: "execute", stmt: { sql: "DELETE FROM session" } },
      { type: "execute", stmt: { sql: "DELETE FROM account" } },
      { type: "execute", stmt: { sql: "DELETE FROM user" } },
      { type: "close" },
    ],
  }),
});

const data = await res.json();
const counts = data.results
  .slice(0, 12)
  .map((r) => r.response?.result?.affected_row_count ?? 0);

const labels = [
  "cash_flows", "trades", "research_picks", "lots", "holdings",
  "portfolio_meta", "quote_cache", "user_settings",
  "verification", "session", "account", "user",
];

for (let i = 0; i < labels.length; i++) {
  if (counts[i] > 0) console.log(`Deleted ${counts[i]} row(s) from ${labels[i]}`);
}
console.log("Reset complete.");
