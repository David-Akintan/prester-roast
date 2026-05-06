import { NextRequest, NextResponse } from "next/server";
import { moderate } from "@/lib/moderation";

const BACKEND_URL = process.env.ROAST_BACKEND_URL;
const BACKEND_SECRET = process.env.ROAST_BACKEND_SECRET;

export async function POST(req: NextRequest) {
  try {
    const { verdictId, content } = await req.json();

    if (!verdictId && verdictId !== 0) {
      return NextResponse.json({ error: "verdictId required" }, { status: 400 });
    }
    if (typeof content !== "string") {
      return NextResponse.json({ error: "content required" }, { status: 400 });
    }

    const verdict = moderate(content);
    if (!verdict.ok) {
      return NextResponse.json(
        { error: verdict.reason, category: verdict.category },
        { status: 400 }
      );
    }

    if (!BACKEND_URL) {
      // Fallback: generate locally via Anthropic if no backend configured
      return NextResponse.json(
        { error: "ROAST_BACKEND_URL not configured" },
        { status: 503 }
      );
    }

    const backendRes = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-roast-secret": BACKEND_SECRET || "",
      },
      body: JSON.stringify({
        verdictId,
        content,
        type: "roast_court",
      }),
    });

    if (!backendRes.ok) {
      const errText = await backendRes.text();
      console.error("Backend error:", backendRes.status, errText);
      return NextResponse.json(
        { error: "Judge backend unavailable" },
        { status: 502 }
      );
    }

    const result = await backendRes.json();

    return NextResponse.json({
      verdictId,
      roast: result.roast || result.text || result.verdict,
      severity: result.severity || "medium", // low | medium | high | devastating
    });
  } catch (err) {
    console.error("/api/roast error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
