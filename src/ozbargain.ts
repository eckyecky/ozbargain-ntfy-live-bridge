import { config } from "./config";
import type { OzBargainResponse } from "./types";
import { $ } from "bun";

export const fetchNewPosts = async (lastTimestamp: number): Promise<OzBargainResponse> => {
  const url = new URL(config.OZBARGAIN_API_URL);
  url.searchParams.set("last", lastTimestamp.toString());
  
  if (lastTimestamp > 0) {
    url.searchParams.delete("update");
  }

  if (config.DEBUG) {
    console.log(`Polling OzBargain via curl: ${url.toString()}`);
  }

  try {
    // Using Bun's shell to execute curl with -i to include headers in stdout
    const result = await $`curl -s -i -H "User-Agent: ${config.USER_AGENT}" -H "Accept: */*" ${url.toString()}`.text();
    
    if (!result || result.trim() === "") {
        throw new Error("Empty response from curl");
    }

    // curl -i puts headers at the top, followed by \r\n\r\n and then the body
    const parts = result.split(/\r?\n\r?\n/);
    // There can be multiple header blocks (e.g., after redirects)
    // The last part is always the body, the part before it is the last header block
    const body = parts[parts.length - 1];
    const headerBlock = parts[parts.length - 2] || "";

    // Simple header parser
    const headers = new Map<string, string>();
    headerBlock.split(/\r?\n/).forEach(line => {
        const [key, ...values] = line.split(':');
        if (key && values.length > 0) {
            headers.set(key.trim().toLowerCase(), values.join(':').trim());
        }
    });

    const statusLine = headerBlock.split(/\r?\n/)[0];
    const status = parseInt(statusLine.split(' ')[1]);

    if (config.DEBUG && (status < 200 || status >= 300)) {
        console.log(`OzBargain Status: ${statusLine}`);
        console.log(`Headers: ${JSON.stringify(Object.fromEntries(headers), null, 2)}`);
    }

    // Handle 429 and 5xx errors with retry-after
    if (status === 429 || (status >= 500 && status <= 599)) {
        const retryAfter = headers.get("retry-after");
        const delaySeconds = retryAfter && /^\d+$/.test(retryAfter) ? parseInt(retryAfter) : 30;
        
        console.warn(`OzBargain API Error ${status}. Retrying in ${delaySeconds}s...`);
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        return fetchNewPosts(lastTimestamp);
    }

    try {
        return JSON.parse(body) as OzBargainResponse;
    } catch (parseError) {
        // If it's not JSON, it might be the 503 HTML page
        if (body.includes("<title>Site Under Maintenance</title>") || body.includes("Just a moment...")) {
            console.warn("OzBargain returned maintenance/challenge page via curl. Retrying in 30s...");
            await new Promise(resolve => setTimeout(resolve, 30000));
            return fetchNewPosts(lastTimestamp);
        }
        throw new Error(`Failed to parse OzBargain response: ${body.substring(0, 100)}...`);
    }
  } catch (error) {
    console.error("Curl execution error:", error);
    // Generic retry for network issues
    await new Promise(resolve => setTimeout(resolve, 30000));
    return fetchNewPosts(lastTimestamp);
  }
};
