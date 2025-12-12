import { callAI } from "../server/utils";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
    console.log("Testing Image Analysis...");

    // A small 1x1 transparent GIF base64 (just to have valid image data)
    // Actually, better to use a small valid PNG or JPEG for AI models.
    // Using a minimal red dot PNG base64
    const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const imageBuffer = Buffer.from(base64Image, "base64");

    try {
        const response = await callAI(
            "What color is this image? Reply with just the color.",
            undefined,
            imageBuffer,
            "image/png"
        );
        console.log("\n✅ AI Response:", response);
    } catch (error: any) {
        console.error("\n❌ Image analysis failed:");
        console.error(error.message);
        if (error.response) {
            console.error("Data:", JSON.stringify(await error.response.json()));
        }
    }
}

main();
