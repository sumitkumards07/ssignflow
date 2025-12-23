
const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing in .env");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function importUsers() {
    console.log("Starting user import...");
    try {
        const filePath = path.join(process.cwd(), 'users.xlsx');
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        // Use raw: false to let simple values be parsed, but check dates?
        // header: 0 implies using the first row as keys, which matches our inspection.
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log(`Found ${data.length} users in Excel file.`);

        let insertedCount = 0;
        let skippedCount = 0;

        for (const user of data) {
            // Data Cleaning / Transformation
            const clashChatNotif = user.clash_chat_notifications === 'true' || user.clash_chat_notifications === true;

            const query = `
        INSERT INTO users (
          id, username, password, google_id, email, display_name, role,
          last_active, api_token, total_focus_time, today_focus_time,
          last_focus_date, avatar, push_token, clash_chat_notifications
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (username) DO UPDATE SET
          password = EXCLUDED.password,
          google_id = EXCLUDED.google_id,
          email = EXCLUDED.email,
          display_name = EXCLUDED.display_name,
          role = EXCLUDED.role,
          last_active = EXCLUDED.last_active,
          api_token = EXCLUDED.api_token,
          total_focus_time = EXCLUDED.total_focus_time,
          today_focus_time = EXCLUDED.today_focus_time,
          last_focus_date = EXCLUDED.last_focus_date,
          avatar = EXCLUDED.avatar,
          push_token = EXCLUDED.push_token,
          clash_chat_notifications = EXCLUDED.clash_chat_notifications;
      `;
            // ON CONFLICT DO UPDATE ensures we update existing users instead of skipping or failing.

            const values = [
                user.id || null, // Ensure ID is present or allow DB to gen (but Excel has IDs so use them)
                user.username,
                user.password,
                user.google_id || null,
                user.email || null,
                user.display_name || null,
                user.role || 'user',
                user.last_active || null,
                user.api_token || null,
                parseInt(user.total_focus_time) || 0,
                parseInt(user.today_focus_time) || 0,
                user.last_focus_date || null,
                user.avatar || null,
                user.push_token || null,
                clashChatNotif
            ];

            try {
                await pool.query(query, values);
                insertedCount++;
                if (insertedCount % 10 === 0) process.stdout.write('.');
            } catch (rowErr) {
                console.error(`\nFailed to import user ${user.username}:`, rowErr.message);
            }
        }

        console.log(`\nImport finished.`);
        console.log(`Processed: ${insertedCount}`);
    } catch (err) {
        console.error("Global Import Error:", err);
    } finally {
        await pool.end();
    }
}

importUsers();
