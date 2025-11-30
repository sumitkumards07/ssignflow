
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    const username = "admin";
    console.log(`Promoting user ${username} to admin...`);

    const [user] = await db.select().from(users).where(eq(users.username, username));

    if (!user) {
        console.error(`User ${username} not found!`);
        process.exit(1);
    }

    await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
    console.log(`User ${username} promoted to admin successfully!`);
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
