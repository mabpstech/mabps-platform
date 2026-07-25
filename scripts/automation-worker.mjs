#!/usr/bin/env node
/**
 * Background automation worker — polls POST /api/automation/queue/process.
 *
 * Requires AUTOMATION_WORKER_SECRET (and a running Next.js app).
 * Env:
 *   NEXT_PUBLIC_APP_URL / BETTER_AUTH_URL  base URL (default http://localhost:3000)
 *   AUTOMATION_WORKER_SECRET               shared secret header
 *   AUTOMATION_WORKER_ID                   optional stable worker id
 *   AUTOMATION_WORKER_INTERVAL_MS          poll interval (default 2000)
 *   AUTOMATION_WORKER_LIMIT                jobs per tick (default 25)
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(projectRoot, ".env") });

const baseUrl = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.BETTER_AUTH_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

const secret = process.env.AUTOMATION_WORKER_SECRET?.trim();
const workerId =
  process.env.AUTOMATION_WORKER_ID?.trim() || `worker_${process.pid}`;
const intervalMs = Math.max(
  500,
  Number.parseInt(process.env.AUTOMATION_WORKER_INTERVAL_MS || "2000", 10) ||
    2000,
);
const limit = Math.min(
  100,
  Math.max(
    1,
    Number.parseInt(process.env.AUTOMATION_WORKER_LIMIT || "25", 10) || 25,
  ),
);

if (!secret) {
  console.error(
    "[automation-worker] AUTOMATION_WORKER_SECRET is required.",
  );
  process.exit(1);
}

let stopping = false;
let inFlight = false;

async function tick() {
  if (stopping || inFlight) return;
  inFlight = true;
  try {
    const response = await fetch(`${baseUrl}/api/automation/queue/process`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-automation-worker-secret": secret,
      },
      body: JSON.stringify({ limit, workerId }),
    });
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }
    if (!response.ok) {
      console.error(
        `[automation-worker] tick failed ${response.status}`,
        body,
      );
      return;
    }
    const claimed = body?.queue?.claimed ?? 0;
    const schedules = body?.schedulesFired ?? 0;
    if (claimed > 0 || schedules > 0) {
      console.log(
        `[automation-worker] schedules=${schedules} claimed=${claimed} processed=${body?.queue?.processed ?? 0} failed=${body?.queue?.failed ?? 0}`,
      );
    }
  } catch (error) {
    console.error("[automation-worker] tick error", error);
  } finally {
    inFlight = false;
  }
}

function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`[automation-worker] ${signal}, shutting down…`);
  clearInterval(timer);
  // Allow in-flight tick to finish briefly, then exit.
  setTimeout(() => process.exit(0), 250).unref?.();
}

console.log(
  `[automation-worker] polling ${baseUrl}/api/automation/queue/process every ${intervalMs}ms (limit=${limit}, id=${workerId})`,
);

const timer = setInterval(tick, intervalMs);
void tick();

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
