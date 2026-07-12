import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";

// Simple in-memory rate limiter: max 10 requests per IP per minute
const rateLimitMap = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ detail: "Too many requests. Please wait a minute and try again." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const { contract_text } = body as Record<string, unknown>;

  if (typeof contract_text !== "string") {
    return NextResponse.json({ detail: "contract_text must be a string." }, { status: 400 });
  }
  if (contract_text.trim().length < 100) {
    return NextResponse.json({ detail: "Contract text is too short." }, { status: 400 });
  }
  if (contract_text.length > 200_000) {
    return NextResponse.json({ detail: "Contract text exceeds maximum length." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${BACKEND}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contract_text }),
      signal: AbortSignal.timeout(120_000), // 2-minute timeout for inference
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json({ detail: data.detail ?? "Backend error." }, { status: upstream.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/analyze] upstream error:", err);
    return NextResponse.json({ detail: "The analysis service is unavailable. Please try again shortly." }, { status: 503 });
  }
}
