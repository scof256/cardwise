#!/usr/bin/env node

import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set in environment variables.");
    process.exit(1);
}

console.log("Testing Supabase database connection...");
console.log("Database URL host:", databaseUrl.replace(/\/\/([^:]+):[^@]+@/, "//$1:***@"));

try {
    const client = postgres(databaseUrl, {
        ssl: "require",
        max_lifetime: 60 * 1000,
        idle_timeout: 30 * 1000,
    });

    const result = await client`SELECT current_database() as database, current_user as user, version() as version`;
    console.log("✅ Database connection established successfully");
    console.log("   Database:", result[0].database);
    console.log("   User:", result[0].user);
    console.log("   Version:", result[0].version.split(" ").slice(0, 2).join(" "));

    const tables = await client`
    SELECT tablename 
    FROM pg_catalog.pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename 
    LIMIT 10
  `;
    console.log("✅ Test query executed successfully");
    console.log("   Sample tables in public schema:", tables.map((t) => t.tablename));

    await client.end();
    console.log("🎉 Supabase migration is working correctly!");
} catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
}