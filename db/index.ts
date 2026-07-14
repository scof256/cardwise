import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Database = ReturnType<typeof createDatabase>;
let database: Database | null = null;

function createDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for database operations.");
  }

  // Configure postgres client for Supabase
  const client = postgres(databaseUrl, {
    ssl: "require",
    max_lifetime: 60 * 1000, // 1 minute
    idle_timeout: 30 * 1000, // 30 seconds
  });

  return drizzle(client, { schema });
}

export function getDb() {
  database ??= createDatabase();
  return database;
}
