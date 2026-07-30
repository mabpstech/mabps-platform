import { NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Unauthenticated liveness/readiness probe for load balancers and uptime checks.
 * Returns 200 when the process can query the database; 503 otherwise.
 * Does not expose secrets or tenant data.
 */
export async function GET() {
  const started = Date.now();
  try {
    sqlite.prepare("SELECT 1 AS ok").get();
    return NextResponse.json(
      {
        status: "ok",
        checks: { database: "ok" },
        latencyMs: Date.now() - started,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("[health]", error);
    return NextResponse.json(
      {
        status: "error",
        checks: { database: "error" },
        latencyMs: Date.now() - started,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
