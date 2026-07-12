"use client";

import { useState } from "react";
import UploadZone      from "@/components/UploadZone";
import RiskBanner      from "@/components/RiskBanner";
import RiskExplanation from "@/components/RiskExplanation";
import ClauseTable     from "@/components/ClauseTable";
import Logo            from "@/components/Logo";
import type { AnalysisResult } from "@/lib/types";

export default function Home() {
  const [result,    setResult]  = useState<AnalysisResult | null>(null);
  const [error,     setError]   = useState("");
  const [loading,   setLoading] = useState(false);

  const reset = () => { setResult(null); setError(""); };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={reset}>
            <Logo size="sm" />
          </button>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-600 hidden sm:block">AI-Powered Contract Risk Analysis</span>
            {result && (
              <button
                onClick={reset}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
              >
                ← New Analysis
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-10">

        {/* ── Landing / Upload ────────────────────────────────────── */}
        {!result && (
          <div className="max-w-2xl mx-auto space-y-10">

            {/* Hero */}
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-2">
                <Logo size="lg" showWordmark={false} />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-xs font-semibold">
                Powered by LegalBERT · Fine-tuned on 510 real contracts
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50 leading-tight">
                Know your lease risks<br />
                <span className="text-indigo-400">before you sign</span>
              </h1>
              <p className="text-zinc-400 text-lg max-w-lg mx-auto">
                Upload any commercial lease. Get a plain-English risk report
                — critical missing clauses, key risk drivers, and a LOW / MEDIUM / HIGH verdict — in under 60 seconds.
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { v: "510", l: "Training Contracts" },
                { v: "41",  l: "Clause Categories" },
                { v: "<60s",l: "Analysis Time" },
              ].map(({ v, l }) => (
                <div key={l} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                  <div className="text-2xl font-black text-indigo-400">{v}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{l}</div>
                </div>
              ))}
            </div>

            {/* Upload zone */}
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}
            <UploadZone
              onResult={setResult}
              onError={setError}
              onLoading={setLoading}
              isLoading={loading}
            />

            {/* Disclaimer */}
            <p className="text-center text-xs text-zinc-700">
              LeaseIQ is an AI research tool. Always have a licensed attorney review any contract before signing.
            </p>
          </div>
        )}

        {/* ── War Room Results Dashboard ──────────────────────────── */}
        {result && (
          <div className="space-y-8 animate-in fade-in duration-500">

            {/* Risk banner — full width */}
            <RiskBanner
              label={result.risk_label}
              probLow={result.prob_low}
              probMedium={result.prob_medium}
              probHigh={result.prob_high}
              missingCritical={result.missing_high_risk}
            />

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                icon="📋"
                value={`${result.clauses ? Object.values(result.clauses).filter(c => c.present).length : "—"}/${Object.keys(result.clauses ?? {}).length || 41}`}
                label="Clauses Found"
              />
              <StatCard
                icon="⚠️"
                value={String(result.missing_high_risk.length)}
                label="Critical Missing"
                highlight={result.missing_high_risk.length > 0}
              />
              <StatCard
                icon="✅"
                value={String(result.present_high_risk.length)}
                label="Critical Present"
              />
              <StatCard
                icon="🎯"
                value={`${result.prob_high.toFixed(0)}%`}
                label="HIGH Risk Probability"
                highlight={result.prob_high > 50}
              />
            </div>

            {/* Two-column layout: explanation + clause table */}
            <div className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2">
                <RiskExplanation result={result} />
              </div>
              <div className="lg:col-span-3">
                <ClauseTable result={result} />
              </div>
            </div>

            {/* Footer CTA */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-zinc-200">Want a full legal review?</p>
                <p className="text-zinc-500 text-sm mt-0.5">
                  This AI report is a starting point. A licensed attorney can negotiate better terms based on these findings.
                </p>
              </div>
              <button
                onClick={reset}
                className="shrink-0 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
              >
                Analyze Another Lease
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon, value, label, highlight = false,
}: {
  icon: string; value: string; label: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "bg-red-500/8 border-red-500/30" : "bg-zinc-900 border-zinc-800"}`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className={`text-2xl font-black ${highlight ? "text-red-400" : "text-zinc-100"}`}>{value}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
    </div>
  );
}
