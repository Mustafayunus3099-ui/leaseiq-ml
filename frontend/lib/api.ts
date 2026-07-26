import type { AnalysisResult } from "./types";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TEXT_LENGTH = 200_000;        // ~150k words — covers the longest CUAD contracts

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function sanitizeText(text: string): string {
  // Strip null bytes and non-printable control chars (keep newlines/tabs)
  return text.replace(/\x00/g, "").replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

export async function analyzeText(contractText: string): Promise<AnalysisResult> {
  const clean = sanitizeText(contractText.trim());

  if (clean.length < 100) throw new ApiError(400, "Contract text is too short. Please paste the full contract.");
  if (clean.length > MAX_TEXT_LENGTH) throw new ApiError(400, "Contract exceeds the 200,000-character limit. Please trim and retry.");

  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contract_text: clean }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new ApiError(res.status, err.detail ?? "Analysis failed. Please try again.");
  }

  return res.json();
}

export async function analyzeFile(file: File): Promise<AnalysisResult> {
  if (file.size > MAX_FILE_SIZE) throw new ApiError(400, "File is too large. Maximum size is 5MB.");

  const allowed = ["application/pdf", "text/plain"];
  if (!allowed.includes(file.type) && !file.name.endsWith(".txt") && !file.name.endsWith(".pdf")) {
    throw new ApiError(400, "Only PDF and plain text (.txt) files are supported.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/analyze-file", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new ApiError(res.status, err.detail ?? "File analysis failed. Please try again.");
  }

  return res.json();
}
