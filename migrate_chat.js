import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function main() {
    console.log('Adding group_id column to clash_messages table...');
    try {
        await sql`ALTER TABLE clash_messages ADD COLUMN IF NOT EXISTS group_id text REFERENCES groups(id)`;
        console.log('Migration successful');
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

main();
