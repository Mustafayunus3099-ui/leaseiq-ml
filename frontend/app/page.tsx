"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import UploadZone      from "@/components/UploadZone";
import RiskBanner      from "@/components/RiskBanner";
import RiskExplanation from "@/components/RiskExplanation";
import ClauseTable     from "@/components/ClauseTable";
import ContractViewer  from "@/components/ContractViewer";
import ComparisonPanel from "@/components/ComparisonPanel";
import TamPanel        from "@/components/TamPanel";
import VoiceButton     from "@/components/VoiceButton";
import Logo            from "@/components/Logo";
import type { AnalysisResult } from "@/lib/types";

// ── Animation variants ─────────────────────────────────────────────────────

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.11, delayChildren: 0.1 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 70, damping: 18 } },
};

const resultsContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const resultsItem = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 80, damping: 18 } },
};

const HOW_IT_WORKS = [
  {
    n: "1",
    title: "Upload your lease",
    desc: "Drop a PDF or paste the text. Supports commercial leases up to 5MB.",
  },
  {
    n: "2",
    title: "LegalBERT reads it",
    desc: "Our model scans 41 clause categories trained on 510 real contracts.",
  },
  {
    n: "3",
    title: "Get your verdict",
    desc: "Plain-English LOW / MEDIUM / HIGH ruling with clause-level explanations.",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────

export default function Home() {
  const [result,  setResult]  = useState<AnalysisResult | null>(null);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setResult(null); setError(""); };

  return (
    <div className="min-h-screen bg-ink text-paper overflow-x-hidden">

      {/* ── Ruled paper background ────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 bg-ruled" aria-hidden />

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-50 border-b border-[#1e2220] bg-ink/90 backdrop-blur-xl"
      >
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={reset} className="focus:outline-none">
            <Logo size="sm" />
          </button>
          <div className="flex items-center gap-4">
            <span className="text-muted text-[11px] tracking-widest uppercase hidden sm:block">
              AI-Powered Contract Review
            </span>
            <AnimatePresence>
              {result && (
                <motion.button
                  key="new-analysis"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  onClick={reset}
                  className="px-3 py-1.5 rounded-lg bg-card hover:bg-lift border border-[#1e2220] text-muted hover:text-paper text-xs transition-colors"
                >
                  ← New analysis
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.nav>

      <main className="relative max-w-6xl mx-auto px-4 py-10">

        <AnimatePresence mode="wait">

          {/* ── Landing / Upload ────────────────────────────────────────── */}
          {!result && (
            <motion.div
              key="landing"
              variants={heroContainer}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -20, transition: { duration: 0.25 } }}
              className="max-w-2xl mx-auto space-y-12"
            >
              {/* Logo mark */}
              <motion.div variants={heroItem} className="flex justify-center">
                <Logo size="lg" showWordmark={false} />
              </motion.div>

              {/* Hero headline */}
              <motion.div variants={heroItem} className="text-center space-y-4">
                <h1 className="font-display text-5xl sm:text-6xl leading-[1.1] text-paper">
                  Your lease,
                  <br />
                  <span className="relative inline-block">
                    analyzed.
                    <span
                      className="absolute -bottom-1 left-0 right-0 h-px"
                      style={{ background: "linear-gradient(to right, transparent, #C09A47, transparent)" }}
                    />
                  </span>
                </h1>
                <p className="text-muted text-sm leading-relaxed max-w-md mx-auto">
                  LegalBERT, fine-tuned on 510 real commercial contracts,
                  reads every clause and returns a plain-English risk verdict in under 60 seconds.
                </p>
              </motion.div>

              {/* Stats — vertical rule style */}
              <motion.div variants={heroItem} className="flex justify-center">
                <div className="flex flex-col gap-3 border-l-2 border-gold/30 pl-6">
                  {[
                    { v: "510",  l: "training contracts" },
                    { v: "41",   l: "clause categories"  },
                    { v: "<60s", l: "analysis time"       },
                  ].map(({ v, l }, i) => (
                    <motion.div
                      key={l}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.32 + i * 0.08, ease: "easeOut", duration: 0.4 }}
                      className="flex items-baseline gap-3"
                    >
                      <span className="text-2xl font-bold text-gold tabular-nums w-14">{v}</span>
                      <span className="text-xs text-muted tracking-wide">{l}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* How it works */}
              <motion.div variants={heroItem} className="space-y-4">
                <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                  How it works
                </p>
                <div className="grid grid-cols-3 gap-6">
                  {HOW_IT_WORKS.map(({ n, title, desc }, i) => (
                    <motion.div
                      key={n}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.48 + i * 0.1, ease: "easeOut", duration: 0.38 }}
                      className="relative"
                    >
                      {/* Large faded step number behind */}
                      <span className="absolute -top-1 -left-1 text-6xl font-bold text-[#1a1f1d] select-none leading-none pointer-events-none">
                        {n}
                      </span>
                      <div className="relative pt-8 space-y-1.5">
                        <p className="text-xs font-semibold text-paper leading-snug">{title}</p>
                        <p className="text-[11px] text-muted leading-relaxed">{desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Upload zone */}
              <motion.div variants={heroItem}>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-4 rounded-xl bg-stamp/10 border border-stamp/30 px-4 py-3 text-stamp text-sm"
                  >
                    {error}
                  </motion.div>
                )}
                <UploadZone
                  onResult={setResult}
                  onError={setError}
                  onLoading={setLoading}
                  isLoading={loading}
                />
              </motion.div>

              <motion.p
                variants={heroItem}
                className="text-center text-[11px] text-muted/50"
              >
                AI research tool — always have a licensed attorney review any contract before signing.
              </motion.p>
            </motion.div>
          )}

          {/* ── Results Dashboard ────────────────────────────────────────── */}
          {result && (
            <motion.div
              key="results"
              variants={resultsContainer}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="space-y-8"
            >
              {/* Risk banner */}
              <motion.div variants={resultsItem}>
                <RiskBanner
                  label={result.risk_label}
                  probLow={result.prob_low}
                  probMedium={result.prob_medium}
                  probHigh={result.prob_high}
                  missingCritical={result.missing_high_risk}
                />
              </motion.div>

              {/* Stat cards */}
              <motion.div variants={resultsItem} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {
                    value: `${result.clauses ? Object.values(result.clauses).filter(c => c.present).length : "—"}/${Object.keys(result.clauses ?? {}).length || 41}`,
                    label: "Clauses Found",
                    highlight: false,
                  },
                  {
                    value: String(result.missing_high_risk.length),
                    label: "Critical Missing",
                    highlight: result.missing_high_risk.length > 0,
                  },
                  {
                    value: String(result.present_high_risk.length),
                    label: "Critical Present",
                    highlight: false,
                  },
                  {
                    value: `${result.prob_high.toFixed(0)}%`,
                    label: "HIGH Risk Prob",
                    highlight: result.prob_high > 50,
                  },
                ].map((card, i) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, scale: 0.8, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 140, damping: 16, delay: 0.15 + i * 0.06 }}
                  >
                    <StatCard {...card} />
                  </motion.div>
                ))}
              </motion.div>

              {/* Risk explanation + clause table */}
              <motion.div variants={resultsItem} className="grid lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2">
                  <RiskExplanation result={result} />
                </div>
                <div className="lg:col-span-3">
                  <ClauseTable result={result} />
                </div>
              </motion.div>

              {/* Contract viewer */}
              {result.contract_excerpt && (
                <motion.div variants={resultsItem}>
                  <ContractViewer
                    text={result.contract_excerpt}
                    clauses={result.clauses ?? {}}
                  />
                </motion.div>
              )}

              {/* Attorney comparison */}
              <motion.div variants={resultsItem}>
                <ComparisonPanel riskLabel={result.risk_label} />
              </motion.div>

              {/* TAM */}
              <motion.div variants={resultsItem}>
                <TamPanel />
              </motion.div>

              {/* Voice Q&A */}
              <motion.div variants={resultsItem}>
                <VoiceButton result={result} />
              </motion.div>

              {/* Footer CTA */}
              <motion.div
                variants={resultsItem}
                className="rounded-2xl border border-[#1e2220] bg-card/50 backdrop-blur-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-paper">Want a full legal review?</p>
                  <p className="text-muted text-sm mt-0.5">
                    This AI report is a starting point. A licensed attorney can negotiate better terms.
                  </p>
                </div>
                <button
                  onClick={reset}
                  className="shrink-0 px-5 py-2.5 rounded-xl bg-gold hover:bg-[#D4AA57] text-ink font-semibold text-sm transition-colors"
                >
                  Analyze another lease
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function StatCard({
  value, label, highlight = false,
}: {
  value: string; label: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 transition-colors ${
      highlight
        ? "bg-stamp/[0.08] border-stamp/30"
        : "bg-card border-[#1e2220] hover:border-[#2a302e]"
    }`}>
      <div className={`text-2xl font-bold tabular-nums ${highlight ? "text-stamp" : "text-paper"}`}>{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </div>
  );
}
