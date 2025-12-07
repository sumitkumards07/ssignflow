
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
        await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS clash_chat_notifications BOOLEAN DEFAULT TRUE;");
        console.log("Migration successful: Added clash_chat_notifications column.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}

migrate();
