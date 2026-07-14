import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

try {
    // Check supabase_migrations schema
    const supabaseMigrations = await sql`
        SELECT * FROM supabase_migrations.schema_migrations ORDER BY version
    `;
    console.log("Supabase migrations:", supabaseMigrations);

    // Check drizzle migrations table structure
    const drizzleMigrations = await sql`
        SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at
    `;
    console.log("\nDrizzle migrations:", drizzleMigrations);

    // Check event tables
    const eventTables = await sql`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'event%'
        ORDER BY tablename
    `;
    console.log("\nEvent tables:", eventTables);

    // Check event enums
    const eventEnums = await sql`
        SELECT t.typname 
        FROM pg_type t 
        JOIN pg_namespace n ON t.typnamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND t.typtype = 'e' 
        AND t.typname LIKE 'event%'
        ORDER BY t.typname
    `;
    console.log("\nEvent enums:", eventEnums);

    // Check user_notifications table (should exist from migration 0001)
    const userNotifications = await sql`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'user_notifications'
    `;
    console.log("\nuser_notifications table:", userNotifications);

} catch (error) {
    console.error("Error:", error.message);
} finally {
    await sql.end();
}