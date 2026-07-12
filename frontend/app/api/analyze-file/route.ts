import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ detail: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ detail: "No file provided." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ detail: "File exceeds the 5MB limit." }, { status: 400 });
  }

  const allowed = ["application/pdf", "text/plain"];
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!allowed.includes(file.type) && ext !== "pdf" && ext !== "txt") {
    return NextResponse.json({ detail: "Only PDF and TXT files are supported." }, { status: 400 });
  }

  // Forward file to backend
  const upstream = new FormData();
  upstream.append("file", file);

  try {
    const res = await fetch(`${BACKEND}/analyze-file`, {
      method: "POST",
      body: upstream,
      signal: AbortSignal.timeout(120_000),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ detail: data.detail ?? "Backend error." }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/analyze-file] upstream error:", err);
    return NextResponse.json({ detail: "The analysis service is unavailable." }, { status: 503 });
  }
}
