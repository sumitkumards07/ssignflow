
import pg from 'pg';
const { Client } = pg;

const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_c5RuOLt7DhVq@ep-plain-brook-ad5wpep8-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require",
    ssl: true
});

async function migrate() {
    try {
        await client.connect();
        console.log("Connected to database...");

        // Create clash_messages table
        await client.query(`
      CREATE TABLE IF NOT EXISTS clash_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR REFERENCES users(id),
        content TEXT NOT NULL,
        timestamp TEXT DEFAULT NOW()
      );
    `);
        console.log("Migration successful: Created clash_messages table.");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}

migrate();
