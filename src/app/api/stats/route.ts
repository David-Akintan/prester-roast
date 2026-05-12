import { NextResponse } from "next/server";
import { readStats } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await readStats();
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    console.error("/api/stats error:", err);
    return NextResponse.json({ error: "stats unavailable" }, { status: 500 });
  }
}
