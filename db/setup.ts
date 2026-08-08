/**
 * Applies db/schema.sql to the database in DATABASE_URL.
 *
 *   npm run db:setup            -- create tables if absent (idempotent)
 *   npm run db:setup -- --drop  -- DESTRUCTIVE: drop all tables first
 *
 * Run this once after creating your Neon/Supabase database, then `npm run db:seed`.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";

const here = path.dirname(fileURLToPath(import.meta.url));

const DROP_ORDER = [
  "glossary_terms",
  "messages",
  "conversations",
  "proposals",
  "jobs",
  "freelancer_profiles",
  "users",
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "\n  DATABASE_URL is not set.\n" +
        "  Copy .env.example to .env and paste your Neon or Supabase connection string.\n",
    );
    process.exit(1);
  }

  const shouldDrop = process.argv.includes("--drop");
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

  try {
    if (shouldDrop) {
      console.log("Dropping existing tables...");
      for (const table of DROP_ORDER) {
        await sql.unsafe(`DROP TABLE IF EXISTS ${table} CASCADE`);
      }
    }

    const schema = await readFile(path.join(here, "schema.sql"), "utf8");
    await sql.unsafe(schema);
    console.log("Schema applied successfully.");
    console.log("Next step:  npm run db:seed");
  } catch (error) {
    console.error("Schema setup failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

void main();
