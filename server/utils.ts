import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// OpenRouter Implementation
export async function callAI(
  prompt: string,
  systemPrompt?: string,
  imageBuffer?: Buffer,
  mimeType?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY; // Keeping env var name for compatibility
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
    const textModel = process.env.OPENROUTER_MODEL || "amazon/nova-lite-v1";
    const visionModel = process.env.OPENROUTER_VISION_MODEL || "google/gemini-2.0-flash-exp:free";
    const modelToUse = isImageRequest ? visionModel : textModel;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://assignflow.app",
        "X-Title": "AssignFlow"
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: messages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content || "";
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
