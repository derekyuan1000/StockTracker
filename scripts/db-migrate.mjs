import { createClient } from "@libsql/client";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, existsSync } from "fs";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = join(__dirname, "../drizzle/migrations");

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await client.execute(`
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL,
    created_at NUMERIC
  )
`);

const journalPath = join(migrationsFolder, "meta/_journal.json");
const journal = JSON.parse(readFileSync(journalPath).toString());

console.log("Running migrations...");
let applied = 0;

for (const entry of journal.entries) {
  const sqlPath = join(migrationsFolder, `${entry.tag}.sql`);
  if (!existsSync(sqlPath)) continue;

  const content = readFileSync(sqlPath).toString();
  const hash = createHash("sha256").update(content).digest("hex");

  const existing = await client.execute({
    sql: "SELECT 1 FROM __drizzle_migrations WHERE hash = ?",
    args: [hash],
  });

  if (existing.rows.length > 0) {
    console.log(`  skip ${entry.tag} (already applied)`);
    continue;
  }

  const statements = content.split("--> statement-breakpoint");
  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;
    try {
      await client.execute(trimmed);
    } catch (err) {
      // Treat "already exists" as idempotent — the table was created outside migrations
      if (err.message?.includes("already exists")) {
        console.log(`  note: skipped "${trimmed.slice(0, 60).trim()}..." (already exists)`);
      } else {
        throw err;
      }
    }
  }

  await client.execute({
    sql: "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
    args: [hash, entry.when],
  });

  console.log(`  applied ${entry.tag}`);
  applied++;
}

console.log(`Migrations complete. ${applied} applied.`);
client.close();
