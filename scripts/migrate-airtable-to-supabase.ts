/**
 * One-time migration: Airtable Tickets → Supabase tickets table.
 * READ-ONLY on Airtable side. Run manually, do not import elsewhere.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/migrate-airtable-to-supabase.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { createClient } from "@supabase/supabase-js";

// Load .env.local (tsx --env-file is not always forwarded; dotenv is a safe fallback)
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// ── ENV VALIDATION ──────────────────────────────────────────────────────────

const AIRTABLE_API_KEY    = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID    = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;

const SUPABASE_URL              = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    console.error(`❌ Missing env var: ${name}`);
    process.exit(1);
  }
  return value;
}

const apiKey    = requireEnv("AIRTABLE_API_KEY",    AIRTABLE_API_KEY);
const baseId    = requireEnv("AIRTABLE_BASE_ID",    AIRTABLE_BASE_ID);
const tableName = requireEnv("AIRTABLE_TABLE_NAME", AIRTABLE_TABLE_NAME);
const supabaseUrl            = requireEnv("NEXT_PUBLIC_SUPABASE_URL",      SUPABASE_URL);
const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY",     SUPABASE_SERVICE_ROLE_KEY);

// ── SUPABASE CLIENT ─────────────────────────────────────────────────────────

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

// ── AIRTABLE TYPES ───────────────────────────────────────────────────────────

interface AirtableFields {
  Title?:      string;
  Name?:       string;
  Type?:       string;
  Datetime?:   string;
  Location?:   string;
  Reference?:  string;
  "Raw notes"?: string;
  "Dat Location"?: string; // alternate field name per task spec
}

interface AirtableRecord {
  id:     string;
  fields: AirtableFields;
}

interface AirtablePage {
  records: AirtableRecord[];
  offset?: string;
}

// ── FETCH ALL AIRTABLE RECORDS (paginated) ──────────────────────────────────

async function fetchAllAirtableRecords(): Promise<AirtableRecord[]> {
  const all: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams({
      "sort[0][field]":     "Datetime",
      "sort[0][direction]": "asc",
    });
    if (offset) params.set("offset", offset);

    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?${params}`;
    const res  = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable API error ${res.status}: ${body}`);
    }

    const page: AirtablePage = await res.json();
    all.push(...page.records);
    offset = page.offset;

    console.log(`  Fetched page: ${page.records.length} records (total so far: ${all.length})`);
  } while (offset);

  return all;
}

// ── DATE HANDLING ────────────────────────────────────────────────────────────
//
// Airtable returns Datetime as ISO 8601 UTC strings like "2025-03-15T20:00:00.000Z".
// PostgreSQL timestamptz accepts ISO strings with timezone info directly.
// We pass the string as-is — no manual offset conversion — to preserve the
// original semantics. The log below lets you verify each value visually.

function toTimestamptz(raw: string | undefined): string | null {
  if (!raw) return null;
  // Validate it's a parseable date; throw early if Airtable sends something unexpected.
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    console.warn(`    ⚠️  Unparseable date: "${raw}" — will store NULL`);
    return null;
  }
  // Return the canonical ISO string (UTC, Z suffix) — identical semantics to Airtable's own representation.
  return d.toISOString();
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("Airtable → Supabase migration");
  console.log(`Table: ${tableName} | Base: ${baseId}`);
  console.log("=".repeat(60));

  // 1. Read all records from Airtable
  console.log("\n📥 Fetching all records from Airtable…");
  const records = await fetchAllAirtableRecords();
  console.log(`✅ Total records from Airtable: ${records.length}\n`);

  if (records.length === 0) {
    console.log("Nothing to migrate. Exiting.");
    return;
  }

  // 2. Map and insert
  console.log("⬆️  Inserting into Supabase…\n");

  let inserted = 0;
  const errors: { id: string; title: string; error: string }[] = [];

  for (const record of records) {
    const f = record.fields ?? {};

    const title    = f.Title ?? f.Name ?? "Untitled";
    const rawDate  = f.Datetime ?? null;
    const tstz     = toTimestamptz(rawDate ?? undefined);
    const location = f.Location ?? f["Dat Location"] ?? null;

    console.log(`  [${title}]`);
    console.log(`    Airtable Datetime raw : ${rawDate ?? "(empty)"}`);
    console.log(`    Supabase timestamptz  : ${tstz ?? "NULL"}`);

    const row = {
      user_id:   null,
      title,
      type:      (f.Type ?? "").toLowerCase() || null,
      datetime:  tstz,
      location:  location || null,
      reference: f.Reference || null,
      raw_notes: f["Raw notes"] || null,
    };

    const { error } = await supabase.from("tickets").insert(row);

    if (error) {
      console.error(`    ❌ Error: ${error.message}`);
      errors.push({ id: record.id, title, error: error.message });
    } else {
      console.log(`    ✅ Inserted OK`);
      inserted++;
    }

    console.log();
  }

  // 3. Summary
  console.log("=".repeat(60));
  console.log("MIGRATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Records read from Airtable : ${records.length}`);
  console.log(`Records inserted in Supabase: ${inserted}`);
  console.log(`Errors                      : ${errors.length}`);

  if (errors.length > 0) {
    console.log("\nFailed records:");
    for (const e of errors) {
      console.log(`  - [${e.id}] "${e.title}": ${e.error}`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
