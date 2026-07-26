"use client";

import { motion } from "framer-motion";
import type { RiskLabel } from "@/lib/types";

interface Props {
  label: RiskLabel;
  probLow: number;
  probMedium: number;
  probHigh: number;
  missingCritical: string[];
}

const STAMP = {
  HIGH:   { text: "#B83232", border: "rgba(184,50,50,0.5)",  bg: "rgba(184,50,50,0.07)",  glow: "0 0 60px -10px rgba(184,50,50,0.35)"  },
  MEDIUM: { text: "#C47820", border: "rgba(196,120,32,0.5)", bg: "rgba(196,120,32,0.07)", glow: "0 0 60px -10px rgba(196,120,32,0.28)" },
  LOW:    { text: "#2D7A4F", border: "rgba(45,122,79,0.5)",  bg: "rgba(45,122,79,0.07)",  glow: "0 0 60px -10px rgba(45,122,79,0.28)"  },
};

export default function RiskBanner({ label, probLow, probMedium, probHigh, missingCritical }: Props) {
  const s = STAMP[label];

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 80, damping: 18 }}
      className="w-full rounded-2xl border border-[#1e2220] bg-card p-8"
      style={{ boxShadow: s.glow }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-8">

        {/* ── Verdict stamp ──────────────────────────────────────────── */}
        <div className="flex flex-col items-start gap-2 min-w-[180px]">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
            Verdict
          </span>
          {/* The stamp — scales in percussively after the banner enters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="stamp"
          >
            <div
              className="px-5 py-2 font-display text-5xl leading-none rounded-sm"
              style={{
                color: s.text,
                border: `2px dashed ${s.border}`,
                background: s.bg,
              }}
            >
              {label}
            </div>
            <div
              className="mt-1.5 text-[10px] font-semibold tracking-[0.25em] uppercase"
              style={{ color: s.text, opacity: 0.65 }}
            >
              RISK
            </div>
          </motion.div>
        </div>

        {/* ── Probability bars ──────────────────────────────────────── */}
        <div className="flex flex-col gap-3 flex-1">
          <ProbBar label="LOW"    value={probLow}    color="#2D7A4F" delay={0.4} />
          <ProbBar label="MEDIUM" value={probMedium} color="#C47820" delay={0.5} />
          <ProbBar label="HIGH"   value={probHigh}   color="#B83232" delay={0.6} />
        </div>
      </div>

      {/* ── Missing critical clauses ────────────────────────────────── */}
      {missingCritical.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ delay: 0.7, duration: 0.4, ease: "easeOut" }}
          className="mt-6 pt-6 border-t border-[#1e2220] overflow-hidden"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stamp mb-3">
            {missingCritical.length} critical clause{missingCritical.length > 1 ? "s" : ""} not found
          </p>
          <div className="flex flex-wrap gap-2">
            {missingCritical.map((clause, i) => (
              <motion.span
                key={clause}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + i * 0.06, type: "spring", stiffness: 200 }}
                className="px-2 py-0.5 rounded text-xs bg-stamp/10 text-stamp border border-stamp/25"
              >
                {clause}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function ProbBar({
  label, value, color, delay,
}: {
  label: string; value: number; color: string; delay: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted w-14 shrink-0 tracking-wide">{label}</span>
      <div className="flex-1 h-1 bg-lift rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94], delay }}
        />
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.5 }}
        className="text-xs text-muted w-10 text-right tabular-nums"
      >
        {value.toFixed(1)}%
      </motion.span>
    </div>
  );
}
