"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { ClauseResult } from "@/lib/types";

interface Props {
  text: string;
  clauses: Record<string, ClauseResult>;
}

type Segment = { text: string; highlight: boolean; label: string };

export default function ContractViewer({ text, clauses }: Props) {
  const { segments, foundCount } = useMemo(() => {
    const presentClauses = Object.entries(clauses)
      .filter(([, c]) => c.present && c.excerpt.trim())
      .map(([name, c]) => ({ name, excerpt: c.excerpt }));

    if (!presentClauses.length) {
      return { segments: [{ text, highlight: false, label: "" }] as Segment[], foundCount: 0 };
    }

    type Span = { start: number; end: number; label: string };
    const spans: Span[] = [];
    for (const { name, excerpt } of presentClauses) {
      const idx = text.indexOf(excerpt);
      if (idx !== -1) spans.push({ start: idx, end: idx + excerpt.length, label: name });
    }
    spans.sort((a, b) => a.start - b.start);

    // Merge overlapping spans
    const merged: Span[] = [];
    for (const s of spans) {
      const last = merged[merged.length - 1];
      if (last && s.start <= last.end) {
        last.end = Math.max(last.end, s.end);
      } else {
        merged.push({ ...s });
      }
    }

    const result: Segment[] = [];
    let cursor = 0;
    for (const span of merged) {
      if (span.start > cursor) result.push({ text: text.slice(cursor, span.start), highlight: false, label: "" });
      result.push({ text: text.slice(span.start, span.end), highlight: true, label: span.label });
      cursor = span.end;
    }
    if (cursor < text.length) result.push({ text: text.slice(cursor), highlight: false, label: "" });

    return { segments: result, foundCount: merged.length };
  }, [text, clauses]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 80, damping: 18 }}
      className="rounded-2xl border border-[#1e2220] bg-card overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-[#1e2220] flex items-center justify-between">
        <h3 className="font-display text-lg text-paper">Contract Text</h3>
        <span className="text-[11px] text-muted px-2 py-0.5 rounded bg-lift border border-[#1e2220]">
          {foundCount} clause{foundCount !== 1 ? "s" : ""} highlighted
        </span>
      </div>

      <div className="p-6 max-h-72 overflow-y-auto">
        <pre className="whitespace-pre-wrap font-mono text-[11px] text-muted leading-relaxed">
          {segments.map((seg, i) =>
            seg.highlight ? (
              <mark
                key={i}
                title={seg.label}
                className="rounded-sm not-italic"
                style={{ background: "rgba(192,154,71,0.18)", color: "#EAE5D8" }}
              >
                {seg.text}
              </mark>
            ) : (
              <span key={i}>{seg.text}</span>
            )
          )}
        </pre>
      </div>

      <div className="px-6 pb-4">
        <p className="text-[10px] text-muted/50">
          Gold highlights mark detected clause excerpts. Scroll to read the full document.
        </p>
      </div>
    </motion.div>
  );
}
