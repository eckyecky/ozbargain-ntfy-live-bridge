import { config } from "./config";
import { fetchNewPosts } from "./ozbargain";
import { sendNotification } from "./ntfy";
import { loadState, saveState } from "./state";
import type { OzBargainRecord } from "./types";

let { lastTimestamp } = loadState();

const poll = async () => {
  try {
    const response = await fetchNewPosts(lastTimestamp);
    const { records } = response;

    if (records && records.length > 0) {
      // Sort records by timestamp ascending to process oldest first
      const sortedRecords = records.sort((a, b) => a.timestamp - b.timestamp);
      
      const newRecords = lastTimestamp === 0 
        ? sortedRecords 
        : sortedRecords.filter(r => r.timestamp > lastTimestamp);

      if (newRecords.length > 0) {
        console.log(`Processing ${newRecords.length} new records.`);
        
        for (const record of newRecords) {
          try {
            await sendNotification(record);
            lastTimestamp = Math.max(lastTimestamp, record.timestamp);
            saveState({ lastTimestamp });
            
            // Wait to stay within ntfy rate limits
            if (config.NTFY_DELAY_MS > 0) {
              await new Promise(resolve => setTimeout(resolve, config.NTFY_DELAY_MS));
            }
          } catch (error) {
            console.error(`Failed to send notification for ${record.title}:`, error);
          }
        }
      }
    }

    // Always ensure the tracker is initialized from the response timestamp if it was zero
    if (lastTimestamp === 0) {
       lastTimestamp = response.timestamp;
       saveState({ lastTimestamp });
       console.log(`Initialized tracker with timestamp ${lastTimestamp}.`);
    }

  } catch (error) {
    console.error("Error in polling loop:", error);
  } finally {
    // Schedule the next poll
    setTimeout(poll, config.POLL_INTERVAL_MS);
  }
};

console.log(`Starting OzBargain Live Bridge...`);
console.log(`Polling every ${config.POLL_INTERVAL_MS / 1000} seconds.`);
console.log(`Sending to topic: ${config.NTFY_TOPIC} @ ${config.NTFY_SERVER}`);

// Initial poll
poll();

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("Gracefully shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Gracefully shutting down...");
  process.exit(0);
});
