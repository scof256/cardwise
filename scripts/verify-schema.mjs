import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

try {
    const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
    console.log(`Tables in database: ${tables.length}`);
    tables.forEach((t) => console.log(`  - ${t.tablename}`));

    const enums = await sql`SELECT t.typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e' ORDER BY t.typname`;
    console.log(`\nEnums: ${enums.length}`);
    enums.forEach((e) => console.log(`  - ${e.typname}`));

    const functions = await sql`SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' ORDER BY routine_name`;
    console.log(`\nFunctions: ${functions.length}`);
    functions.forEach((f) => console.log(`  - ${f.routine_name}`));

    const extensions = await sql`SELECT extname FROM pg_extension ORDER BY extname`;
    console.log("\nExtensions:");
    extensions.forEach((e) => console.log(`  - ${e.extname}`));

    const indexes = await sql`SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname`;
    console.log(`\nIndexes: ${indexes.length}`);

    const rlsTables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true ORDER BY tablename`;
    console.log(`\nRLS-enabled tables: ${rlsTables.length}`);
    rlsTables.forEach((t) => console.log(`  - ${t.tablename}`));
} catch (error) {
    console.error("Error:", error.message);
    process.exitCode = 1;
} finally {
    await sql.end();
}