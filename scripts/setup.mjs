// One-time Supabase setup: creates the login user and the results table.
// Run with: npm run setup
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const PROJECT_REF = new globalThis.URL(URL).hostname.split(".")[0];

const SQL = `
create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  player text not null check (player in ('Alvin','Brian','Niven','Sam')),
  wins int not null default 0,
  losses int not null default 0,
  created_at timestamptz not null default now()
);
alter table results enable row level security;
drop policy if exists "authenticated full access" on results;
create policy "authenticated full access" on results
  for all to authenticated using (true) with check (true);
`;

async function createUser() {
  const res = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "pool@gmail.com",
      password: "Migos",
      email_confirm: true,
    }),
  });
  const body = await res.json();
  if (res.ok) {
    console.log("✔ Login user created: pool@gmail.com");
  } else if (body.error_code === "email_exists" || body.code === 422 || res.status === 422) {
    console.log("✔ Login user already exists: pool@gmail.com");
  } else {
    throw new Error(`User creation failed (${res.status}): ${JSON.stringify(body)}`);
  }
}

async function createTable() {
  const regions = ["eu-west-1", "eu-central-1", "eu-west-2", "eu-west-3", "eu-north-1", "us-east-1", "us-east-2", "us-west-1", "ap-southeast-1", "ap-south-1", "sa-east-1", "af-south-1"];
  const hosts = regions.flatMap((r) => [
    `aws-1-${r}.pooler.supabase.com`,
    `aws-0-${r}.pooler.supabase.com`,
  ]);
  for (const host of hosts) {
    const client = new pg.Client({
      host,
      port: 5432,
      user: `postgres.${PROJECT_REF}`,
      password: DB_PASSWORD,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    try {
      await client.connect();
      await client.query(SQL);
      await client.end();
      console.log(`✔ Table "results" + RLS policy created (via ${host})`);
      return;
    } catch (err) {
      await client.end().catch(() => {});
      if (/password|SASL/i.test(err.message)) {
        throw new Error(`Connected to ${host} but auth failed: ${err.message}`);
      }
      console.log(`  … ${host}: ${err.message}`);
    }
  }
  console.error("\n✘ Could not reach the database pooler. Paste this SQL into the Supabase SQL Editor instead:\n");
  console.error(SQL);
  process.exit(1);
}

await createUser();
await createTable();
console.log("\nAll done! 🎱");
