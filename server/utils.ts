import express, { type Express } from "express";
import fs from "fs";
import path from "path";

// __dirname and __filename removed (not needed for CJS build if using process.cwd)

// OpenRouter Implementation
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.GEMINI_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://assignflow.app",
    "X-Title": "AssignFlow",
  },
});

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
    // Use a vision-capable model for image requests
    // amazon/nova-lite-v1 does NOT support images, so we use gemini for vision tasks
    // Use gpt-4o-mini for both text and vision as it is cheap, fast, and reliable
    const textModel = "openai/gpt-4o-mini";
    const visionModel = "openai/gpt-4o-mini";
    const modelToUse = isImageRequest ? visionModel : textModel;

    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: messages as any,
    });

    return completion.choices[0].message.content || "";
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
  // In Lambda (or Prod), static files are at the root (process.cwd()/public)
  const distPath = path.resolve(process.cwd(), "public");

  console.log("Serving static files from:", distPath);
  console.log("Current directory:", process.cwd());

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
