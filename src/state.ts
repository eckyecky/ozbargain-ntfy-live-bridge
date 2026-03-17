import { join } from "path";
import { config } from "./config";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";

const STATE_FILE = join(config.DATA_DIR, "state.json");

interface State {
  lastTimestamp: number;
}

export const loadState = (): State => {
  if (existsSync(STATE_FILE)) {
    try {
      return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    } catch (e) {
      console.error("Failed to parse state file, starting fresh:", e);
    }
  }
  return { lastTimestamp: 0 };
};

export const saveState = (newState: Partial<State>): void => {
  try {
    const currentState = loadState();
    const updatedState = { ...currentState, ...newState };

    if (!existsSync(config.DATA_DIR)) {
      mkdirSync(config.DATA_DIR, { recursive: true });
    }
    writeFileSync(STATE_FILE, JSON.stringify(updatedState, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save state file:", e);
  }
};
