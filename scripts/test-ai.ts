import { callAI } from "../server/utils";
import dotenv from "dotenv";
import path from "path";

// Load env vars from root .env if it exists
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
    console.log("Testing AI integration...");
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY is not set in environment variables.");
        process.exit(1);
    }

    console.log(`Using API Key starting with: ${apiKey.substring(0, 8)}...`);

    try {
        const response = await callAI("Say 'Hello from Gemini!' if you can hear me.");
        console.log("\n✅ AI Response:");
        console.log(response);
    } catch (error: any) {
        console.error("\n❌ AI execution failed:");
        console.error(error.message);
        if (error.status === 403) {
            console.error("Hint: Check if your API key is valid and has access to the model.");
        }
    }
}

main();
