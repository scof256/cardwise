import postgres from 'postgres';
import 'dotenv/config';

async function main() {
  const sql = postgres(process.env.DATABASE_URL);
  try {
    await sql`DROP SCHEMA public CASCADE`;
    console.log("Dropped schema public");
    await sql`CREATE SCHEMA public`;
    console.log("Created schema public");
    await sql`GRANT ALL ON SCHEMA public TO postgres`;
    await sql`GRANT ALL ON SCHEMA public TO public`;
    console.log("Granted permissions");
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

main();
