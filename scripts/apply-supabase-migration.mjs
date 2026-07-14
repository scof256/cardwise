import "dotenv/config";
import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

try {
    const migrationPath = join(process.cwd(), "supabase/migrations/20260713153401_hybrid_business_card_search.sql");
    const migrationSql = readFileSync(migrationPath, "utf-8");

    console.log("Applying hybrid search migration...");
    await sql.unsafe(migrationSql);
    console.log("✓ Migration applied successfully");

    // Verify the function exists
    const func = await sql`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'hybrid_search_business_cards'
    `;
    console.log("\nhybrid_search_business_cards function:", func.length > 0 ? "EXISTS ✓" : "MISSING ✗");

    // Verify the fts column exists
    const ftsColumn = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'search_documents' 
        AND column_name = 'fts'
    `;
    console.log("fts column on search_documents:", ftsColumn.length > 0 ? "EXISTS ✓" : "MISSING ✗");

    // Verify the GIN index exists
    const ginIndex = await sql`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'search_documents' 
        AND indexname = 'search_documents_fts_idx'
    `;
    console.log("search_documents_fts_idx index:", ginIndex.length > 0 ? "EXISTS ✓" : "MISSING ✗");

    // Verify RLS is enabled
    const rls = await sql`
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'search_documents'
    `;
    console.log("RLS on search_documents:", rls.length > 0 && rls[0].rowsecurity ? "ENABLED ✓" : "DISABLED ✗");

} catch (error) {
    console.error("Error:", error.message);
    process.exitCode = 1;
} finally {
    await sql.end();
}