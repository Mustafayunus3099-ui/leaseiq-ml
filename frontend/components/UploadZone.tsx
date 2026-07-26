"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      <div className="flex gap-1 bg-card border border-[#1e2220] p-1 rounded-xl w-fit mx-auto">
        {(["upload", "paste"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative z-10 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "text-ink" : "text-muted hover:text-paper"
            }`}
          >
            {tab === t && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 -z-10 rounded-lg bg-gold"
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              />
            )}
            {t === "upload" ? "Upload file" : "Paste text"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Upload tab ──────────────────────────────────────────────── */}
        {tab === "upload" && !isLoading && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 cursor-pointer transition-all duration-200 ${
              dragging
                ? "border-gold bg-[rgba(192,154,71,0.06)]"
                : "border-[#1e2220] hover:border-[#2e3834] hover:bg-card/50"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }}
            />

            {/* Document icon */}
            <motion.div
              animate={dragging
                ? { scale: 1.12, rotate: [0, -4, 4, 0] }
                : { scale: [1, 1.03, 1] }}
              transition={dragging
                ? { duration: 0.3 }
                : { duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg
                width="40" height="40" viewBox="0 0 40 40" fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect x="6" y="2" width="24" height="32" rx="2" stroke={dragging ? "#C09A47" : "#2e3834"} strokeWidth="1.5" />
                <path d="M24 2v8h8" stroke={dragging ? "#C09A47" : "#2e3834"} strokeWidth="1.5" strokeLinecap="round" />
                <line x1="11" y1="17" x2="29" y2="17" stroke={dragging ? "#C09A47" : "#3a4540"} strokeWidth="1.2" strokeLinecap="round" />
                <line x1="11" y1="22" x2="29" y2="22" stroke={dragging ? "#C09A47" : "#3a4540"} strokeWidth="1.2" strokeLinecap="round" />
                <line x1="11" y1="27" x2="22" y2="27" stroke={dragging ? "#C09A47" : "#3a4540"} strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </motion.div>

            <div className="text-center">
              <p className="text-paper text-sm font-medium">Drop your lease here</p>
              <p className="text-muted text-xs mt-1">PDF or TXT · max 5MB</p>
            </div>

            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-4 py-2 rounded-lg bg-gold hover:bg-[#D4AA57] text-ink text-sm font-medium transition-colors"
            >
              Browse files
            </motion.div>

            {dragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ boxShadow: "inset 0 0 40px rgba(192,154,71,0.08)" }}
              />
            )}
          </motion.div>
        )}

        {/* ── Paste tab ──────────────────────────────────────────────── */}
        {tab === "paste" && !isLoading && (
          <motion.div
            key="paste"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your contract text here…"
              rows={10}
              className="w-full rounded-2xl bg-card border border-[#1e2220] p-4 text-sm text-paper placeholder-muted outline-none focus:border-gold/50 resize-none font-code leading-relaxed transition-colors"
            />
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              disabled={text.trim().length < 100}
              onClick={() => handle(undefined, text)}
              className="w-full py-3 rounded-xl bg-gold hover:bg-[#D4AA57] disabled:bg-lift disabled:text-muted text-ink font-semibold transition-colors"
            >
              Analyze contract
            </motion.button>
          </motion.div>
        )}

        {/* ── Loading state ──────────────────────────────────────────── */}
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-4 py-10"
          >
            <div className="relative w-14 h-14">
              <motion.div
                className="absolute inset-0 rounded-full border border-gold/15"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border border-transparent border-t-gold/60"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
              />
              {/* Scales of justice SVG centred in spinner */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 48 48" fill="none" aria-hidden>
                  <rect x="23" y="9" width="2" height="22" rx="1" fill="#C09A47" opacity="0.7" />
                  <rect x="9" y="15" width="30" height="2" rx="1" fill="#C09A47" opacity="0.7" />
                  <rect x="12" y="17" width="2" height="6" rx="1" fill="#C09A47" opacity="0.5" />
                  <path d="M8.5 23 Q9 27 13 27 Q17 27 17.5 23 Z" fill="#C09A47" opacity="0.6" />
                  <rect x="34" y="17" width="2" height="8" rx="1" fill="#C09A47" opacity="0.5" />
                  <path d="M30.5 25 Q31 29 35 29 Q39 29 39.5 25 Z" fill="#C09A47" opacity="0.5" />
                </svg>
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm text-paper font-medium">LegalBERT is reading your contract…</p>
              <p className="text-xs text-muted">This can take up to 60 seconds</p>
            </div>
            <div className="w-48 h-px rounded-full overflow-hidden bg-lift">
              <div className="shimmer h-full w-full rounded-full" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo mode */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-[#1e2220]" />
            <span className="text-xs text-muted">or</span>
            <div className="flex-1 h-px bg-[#1e2220]" />
          </div>
          <motion.button
            whileHover={{ scale: 1.01, borderColor: "rgba(192,154,71,0.35)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onResult(DEMO_RESULT)}
            className="w-full py-2.5 rounded-xl border border-[#1e2220] text-muted hover:text-paper text-sm transition-all"
          >
            Try a demo contract
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
