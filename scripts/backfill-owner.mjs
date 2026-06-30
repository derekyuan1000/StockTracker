// One-time Phase 2 backfill: attribute all pre-auth (global) portfolio data to
// the owner account. The owner must have signed in with Google at least once so
// their row exists in `user`. Idempotent — only touches rows where user_id IS NULL.
// Run: npm run db:backfill-owner

const OWNER_EMAIL = process.env.OWNER_EMAIL || "derekyuan1000@gmail.com";

const dbUrl = `${process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, "https://")}/v2/pipeline`;
const dbToken = process.env.TURSO_AUTH_TOKEN;

async function turso(stmts) {
  const res = await fetch(dbUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${dbToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [...stmts.map((stmt) => ({ type: "execute", stmt })), { type: "close" }],
    }),
  });
  const data = await res.json();
  if (data.results?.some((r) => r.type === "error")) {
    const err = data.results.find((r) => r.type === "error");
    throw new Error(`Turso error: ${JSON.stringify(err.error)}`);
  }
  return data.results;
}

// 1. Resolve the owner's user id by email.
const [ownerRes] = await turso([
  {
    sql: "SELECT id FROM user WHERE email = ? LIMIT 1",
    args: [{ type: "text", value: OWNER_EMAIL }],
  },
]);
const ownerRow = ownerRes.response.result.rows[0];
if (!ownerRow) {
  console.error(
    `No user found for ${OWNER_EMAIL}. Sign in with that Google account once, then re-run.`,
  );
  process.exit(1);
}
const ownerId = ownerRow[0].value;
console.log(`Owner ${OWNER_EMAIL} -> ${ownerId}`);

// 2. Claim every unowned row across the data tables.
const TABLES = ["holdings", "lots", "cash_flows", "trades", "research_picks", "portfolio_meta"];
let total = 0;
for (const table of TABLES) {
  const [res] = await turso([
    {
      sql: `UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`,
      args: [{ type: "text", value: ownerId }],
    },
  ]);
  const affected = res.response.result.affected_row_count ?? 0;
  total += affected;
  console.log(`  ${table.padEnd(16)} ${affected} row(s) claimed`);
}

console.log(`\nDone. Attributed ${total} row(s) to ${OWNER_EMAIL}.`);
