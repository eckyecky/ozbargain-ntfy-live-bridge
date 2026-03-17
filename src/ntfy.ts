import { config } from "./config";
import type { OzBargainRecord } from "./types";

export const sendNotification = async (record: OzBargainRecord): Promise<void> => {
  const fullLink = `https://www.ozbargain.com.au${record.link}`;

  // Extract post ID from link (e.g., "/node/952185" -> "952185")
  const postId = record.link.split('/').pop() || "";
  const last2 = postId.padStart(2, '0').slice(-2);
  const thumbnailUrl = postId ? `https://files.ozbargain.com.au/n/${last2}/${postId}.jpg` : "";

  const payload: any = {
    topic: config.NTFY_TOPIC,
    title: record.title,
    message: `${record.action} by ${record.name} (${record.type})`,
    click: fullLink,
    tags: [record.type.toLowerCase()],
  };

  if (thumbnailUrl) {
    payload.attach = thumbnailUrl;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.NTFY_ACCESS_TOKEN) {
    headers["Authorization"] = `Bearer ${config.NTFY_ACCESS_TOKEN}`;
  }

  if (config.DEBUG) {
    console.log(`Sending ntfy notification to ${config.NTFY_SERVER}: ${record.title}`);
  }

  const response = await fetch(config.NTFY_SERVER, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (response.status === 429 || (response.status >= 500 && response.status <= 599)) {
    const responseBody = await response.text();
    const responseHeaders = Object.fromEntries(response.headers.entries());

    console.warn(`ntfy API Error ${response.status}:`);
    console.warn(`Headers: ${JSON.stringify(responseHeaders, null, 2)}`);
    console.warn(`Body: ${responseBody.substring(0, 500)}${responseBody.length > 500 ? '...' : ''}`);

    let delayMs = 60000; // Default to 60 seconds

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      if (retryAfter) {
        if (/^\d+$/.test(retryAfter)) {
          delayMs = parseInt(retryAfter) * 1000;
        } else {
          const retryDate = new Date(retryAfter);
          if (!isNaN(retryDate.getTime())) {
            delayMs = Math.max(0, retryDate.getTime() - Date.now());
          }
        }
      }
    }

    console.warn(`Retrying in ${delayMs / 1000}s...`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return sendNotification(record);
  }

  if (!response.ok) {
    throw new Error(`ntfy API error: ${response.status} ${response.statusText}`);
  }
};
