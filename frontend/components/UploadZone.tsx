"use client";

import { useCallback, useRef, useState } from "react";
import { analyzeFile, analyzeText, ApiError } from "@/lib/api";
import { DEMO_RESULT, type AnalysisResult } from "@/lib/types";

interface Props {
  onResult: (result: AnalysisResult) => void;
  onError: (msg: string) => void;
  onLoading: (loading: boolean) => void;
  isLoading: boolean;
}

export default function UploadZone({ onResult, onError, onLoading, isLoading }: Props) {
  const [dragging, setDragging] = useState(false);
  const [tab, setTab]           = useState<"upload" | "paste">("upload");
  const [text, setText]         = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handle = useCallback(
    async (file?: File, pasteText?: string) => {
      onError("");
      onLoading(true);
      try {
        const result = file ? await analyzeFile(file) : await analyzeText(pasteText!);
        onResult(result);
      } catch (err) {
        onError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      } finally {
        onLoading(false);
      }
    },
    [onResult, onError, onLoading],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handle(file);
    },
    [handle],
  );

  return (
    <div className="w-full space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl w-fit mx-auto">
        {(["upload","paste"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t ? "bg-indigo-600 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t === "upload" ? "Upload File" : "Paste Text"}
          </button>
        ))}
      </div>

      {/* Upload tab */}
      {tab === "upload" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !isLoading && fileRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 cursor-pointer transition-all duration-200
            ${dragging ? "border-indigo-500 bg-indigo-500/5 drag-over" : "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50"}`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }}
          />
          <div className="text-5xl">📄</div>
          <div className="text-center">
            <p className="text-zinc-200 font-semibold">Drop your lease here</p>
            <p className="text-zinc-500 text-sm mt-1">PDF or TXT · max 5MB</p>
          </div>
          <div className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors">
            Browse files
          </div>
        </div>
      )}

      {/* Paste tab */}
      {tab === "paste" && (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your contract text here…"
            rows={10}
            className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 p-4 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-indigo-500 resize-none font-mono leading-relaxed"
          />
          <button
            disabled={isLoading || text.trim().length < 100}
            onClick={() => handle(undefined, text)}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold transition-colors"
          >
            {isLoading ? "Analyzing…" : "Analyze Contract"}
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm text-zinc-500">LegalBERT is reading your contract…</p>
        </div>
      )}

      {/* Demo mode */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-xs text-zinc-600">or</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>
      <button
        onClick={() => onResult(DEMO_RESULT)}
        className="w-full py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 text-sm transition-all"
      >
        ⚡ Try a demo contract
      </button>
    </div>
  );
}
