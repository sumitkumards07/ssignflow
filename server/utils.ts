import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// OpenRouter Implementation
// OpenRouter Implementation
import { OpenRouter } from "@openrouter/sdk";

export async function callAI(
  prompt: string,
  systemPrompt?: string,
  imageBuffer?: Buffer,
  mimeType?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key not configured");
  }

  const openrouter = new OpenRouter({
    apiKey: apiKey
  });

  const messages: any[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  // Determine if this is an image analysis request
  const isImageRequest = imageBuffer && mimeType;

  if (isImageRequest) {
    const base64Image = imageBuffer.toString("base64");
    messages.push({
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`
          }
        }
      ]
    });
  } else {
    messages.push({ role: "user", content: prompt });
  }

  try {
    // Determine model
    // Note: amazon/nova-lite-v1 was causing issues, using gemini for vision or fallback
    // User requested amazon/nova-2-lite-v1:free in the snippet but also wants vision.
    // For vision we MUST use a vision model.
    const textModel = process.env.OPENROUTER_MODEL || "amazon/nova-lite-v1";
    const visionModel = process.env.OPENROUTER_VISION_MODEL || "google/gemini-2.0-flash-exp:free";
    const modelToUse = isImageRequest ? visionModel : textModel;

    const completion = await openrouter.chat.send({
      model: modelToUse,
      messages: messages,
      stream: false
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("AI Call Failed:", error);
    throw error;
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  console.log("Serving static files from:", distPath);
  console.log("Current directory:", __dirname);

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
