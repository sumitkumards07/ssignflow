import { log } from "./utils";

const DUB_API_URL = "https://api.dub.co/api";

export async function shortenLink(url: string, key?: string): Promise<string | null> {
    const apiKey = process.env.DUB_API_KEY;

    if (!apiKey) {
        console.warn("DUB_API_KEY is not set. Returning original URL.");
        return url;
    }

    try {
        const response = await fetch(`${DUB_API_URL}/links`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                url: url,
                key: key, // Optional custom alias
                domain: "dub.sh", // Or your custom domain
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Dub.co API error:", error);
            return url; // Fallback to original
        }

        const data = await response.json();
        return data.shortLink;
    } catch (error) {
        console.error("Failed to shorten link with Dub:", error);
        return url;
    }
}
