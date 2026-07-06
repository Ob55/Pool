// Migration: add Colo as an allowed player + a played_on date column.
// Run with: node scripts/migrate-colo.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const PROJECT_REF = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];

const SQL = `
alter table results drop constraint if exists results_player_check;
alter table results add constraint results_player_check
  check (player in ('Alvin','Brian','Niven','Sam','Colo'));
alter table results add column if not exists played_on date not null default current_date;
`;

const client = new pg.Client({
  host: "aws-0-eu-central-1.pooler.supabase.com",
  port: 5432,
  user: `postgres.${PROJECT_REF}`,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

await client.connect();
await client.query(SQL);
await client.end();
console.log("✔ Migration applied: Colo allowed + played_on column added");
