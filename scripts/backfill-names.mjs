// Re-resolves holding company names from Yahoo and updates rows whose stored
// `name` is still just the ticker (captured when Yahoo's /v7 endpoint was failing).
// Run: npm run db:backfill-names

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

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
  return data.results;
}

// ── Yahoo cookie + crumb ──────────────────────────────────────────────────────
async function fetchCookie() {
  for (const url of ["https://fc.yahoo.com/", "https://finance.yahoo.com/"]) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      const cookie = (res.headers.getSetCookie?.() ?? [])
        .map((c) => c.split(";")[0])
        .join("; ");
      if (cookie) return cookie;
    } catch {}
  }
  return "";
}

async function getSession() {
  const cookie = await fetchCookie();
  const res = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: { "User-Agent": UA, ...(cookie ? { Cookie: cookie } : {}) },
  });
  const crumb = (await res.text()).trim();
  if (!crumb || crumb.includes("<")) throw new Error("Failed to obtain Yahoo crumb");
  return { cookie, crumb };
}

async function resolveName(ticker, session) {
  // 1. /v7 quote (long/short name) — needs crumb
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
      ticker,
    )}&crumb=${encodeURIComponent(session.crumb)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, ...(session.cookie ? { Cookie: session.cookie } : {}) },
    });
    if (res.ok) {
      const r = (await res.json())?.quoteResponse?.result?.[0];
      const name = r?.longName ?? r?.shortName;
      if (name) return name;
    }
  } catch {}
  // 2. Fallback: anonymous search endpoint top match
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      ticker,
    )}&quotesCount=5&newsCount=0`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) {
      const quotes = (await res.json())?.quotes ?? [];
      const match = quotes.find((q) => q.symbol === ticker) ?? quotes[0];
      const name = match?.longname ?? match?.shortname;
      if (name) return name;
    }
  } catch {}
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const [holdingsRes] = await turso([{ sql: "SELECT ticker, name FROM holdings" }]);
const rows = holdingsRes.response.result.rows.map((row) => ({
  ticker: row[0].value,
  name: row[1].value,
}));

const session = await getSession();
let updated = 0;

for (const { ticker, name } of rows) {
  // Only backfill rows where the name never resolved (name === ticker)
  if (name && name !== ticker) {
    console.log(`skip   ${ticker}  (already "${name}")`);
    continue;
  }
  const resolved = await resolveName(ticker, session);
  if (!resolved || resolved === ticker) {
    console.log(`miss   ${ticker}  (no name found)`);
    continue;
  }
  await turso([
    {
      sql: "UPDATE holdings SET name = ? WHERE ticker = ?",
      args: [
        { type: "text", value: resolved },
        { type: "text", value: ticker },
      ],
    },
  ]);
  console.log(`update ${ticker}  ->  ${resolved}`);
  updated++;
}

console.log(`\nDone. Updated ${updated} of ${rows.length} holdings.`);
