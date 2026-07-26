"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  FileText, ShieldCheck, Mic2,
  CheckCircle2, XCircle, AlertTriangle,
  ArrowRight, UploadCloud, ChevronDown,
} from "lucide-react";
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

function FadeIn({
  children,
  delay = 0,
  className = "",
  direction = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "left" | "right";
}) {
  const ref  = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const initial =
    direction === "left"  ? { opacity: 0, x: -40 } :
    direction === "right" ? { opacity: 0, x:  40 } :
                            { opacity: 0, y:  32 };
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={initial}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}

function ProductMockup() {
  return (
    <div className="relative">
      <div className="float">
        <div className="bg-white rounded-2xl shadow-2xl border border-stone-100 p-6 w-[300px] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
              Contract Analysis
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold tracking-wider border border-red-100">
              HIGH RISK
            </span>
          </div>

          <div className="space-y-2">
            {[
              { label: "LOW",    pct: 12, color: "bg-emerald-500" },
              { label: "MEDIUM", pct: 23, color: "bg-amber-500"   },
              { label: "HIGH",   pct: 65, color: "bg-red-500"     },
            ].map(({ label, pct, color }, i) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] text-stone-400 w-12">{label}</span>
                <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.2, delay: 0.6 + i * 0.15, ease: "easeOut" }}
                  />
                </div>
                <span className="text-[10px] text-stone-400 w-7 text-right">{pct}%</span>
              </div>
            ))}
          </div>

          <div className="pt-1 space-y-1.5">
            <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide">
              3 critical clauses missing
            </p>
            {["Limitation of Liability", "Indemnification", "Force Majeure"].map(c => (
              <div key={c} className="flex items-center gap-1.5">
                <XCircle size={11} className="text-red-400 shrink-0" />
                <span className="text-[11px] text-stone-600">{c}</span>
              </div>
            ))}
          </div>

          <div className="pt-1 space-y-1.5">
            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">
              2 protective clauses found
            </p>
            {["Governing Law", "Dispute Resolution"].map(c => (
              <div key={c} className="flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                <span className="text-[11px] text-stone-600">{c}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-stone-400">Analyzed in</span>
              <span className="font-semibold text-amber-600">48 seconds</span>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
        className="absolute -top-3 -right-4 bg-amber-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg"
      >
        AI-Powered ⚡
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="absolute -bottom-3 -left-4 bg-white border border-stone-100 shadow-lg rounded-xl px-3 py-2 flex items-center gap-2"
      >
        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 size={11} className="text-emerald-600" />
        </div>
        <span className="text-[11px] text-stone-600 font-medium">LegalBERT · 41 clauses</span>
      </motion.div>
    </div>
  );
}

const FEATURES = [
  {
    icon: FileText,
    color: "bg-amber-50 text-amber-600",
    title: "AI Clause Extraction",
    desc: "LegalBERT — trained on 510 real commercial contracts — reads 41 clause categories and highlights exactly what's present and what's missing.",
  },
  {
    icon: ShieldCheck,
    color: "bg-emerald-50 text-emerald-600",
    title: "Instant Risk Scoring",
    desc: "XGBoost classifies your contract as LOW, MEDIUM, or HIGH risk in seconds. SHAP values explain every driver, clause by clause.",
  },
  {
    icon: Mic2,
    color: "bg-blue-50 text-blue-600",
    title: "Voice Q&A Agent",
    desc: "Ask questions out loud. Our voice agent reads the analysis and answers in plain English — no legal jargon, no guesswork.",
  },
];

const STEPS = [
  {
    n: "01",
    icon: UploadCloud,
    title: "Upload your lease",
    desc: "Drop a PDF or paste the contract text. Supports commercial leases up to 5MB.",
  },
  {
    n: "02",
    icon: FileText,
    title: "AI reads every clause",
    desc: "LegalBERT scans all 41 clause categories trained on real CUAD dataset contracts.",
  },
  {
    n: "03",
    icon: ShieldCheck,
    title: "Get your risk verdict",
    desc: "Instant LOW / MEDIUM / HIGH ruling with clause-level explanations and missing clause alerts.",
  },
];

const STATS = [
  { value: "510",   label: "Training contracts" },
  { value: "41",    label: "Clause categories"  },
  { value: "99%",   label: "Risk accuracy"       },
  { value: "<60s",  label: "Analysis time"       },
];

const resultsItem = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 80, damping: 18 } },
};
const resultsContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export default function Home() {
  const [result,  setResult]  = useState<AnalysisResult | null>(null);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const toolRef = useRef<HTMLDivElement>(null);

  const scrollToTool = () =>
    toolRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const reset = () => { setResult(null); setError(""); };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 overflow-x-hidden">

      {/* ── Sticky Nav ─────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-100"
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={reset} className="focus:outline-none">
            <Logo size="sm" />
          </button>
          <div className="hidden sm:flex items-center gap-8 text-sm text-stone-500">
            <button onClick={scrollToTool} className="hover:text-stone-900 transition-colors">
              Analyze
            </button>
            <a href="#features" className="hover:text-stone-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-stone-900 transition-colors">How it works</a>
          </div>
          <div className="flex items-center gap-3">
            <AnimatePresence>
              {result && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  onClick={reset}
                  className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-medium transition-colors"
                >
                  ← New analysis
                </motion.button>
              )}
            </AnimatePresence>
            <button
              onClick={scrollToTool}
              className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors"
            >
              Try it free
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <section className="relative bg-white overflow-hidden">
              {/* Background blobs */}
              <div className="orb w-96 h-96 bg-amber-100/60 top-0 -right-20 opacity-70" />
              <div className="orb w-72 h-72 bg-emerald-100/50 bottom-0 -left-16 opacity-60" />

              <div className="relative max-w-6xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
                {/* Left */}
                <div className="space-y-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    AI-Powered Legal Analysis
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.1 }}
                    className="font-display text-5xl sm:text-6xl leading-[1.1] text-stone-900"
                  >
                    Commercial leases,
                    <br />
                    <span className="relative">
                      analyzed
                      <span
                        className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full"
                        style={{ background: "linear-gradient(to right, #C09A47, #E8C56E, #C09A47)" }}
                      />
                    </span>{" "}
                    in seconds.
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-stone-500 text-lg leading-relaxed max-w-md"
                  >
                    LegalBERT, fine-tuned on 510 real contracts, reads every clause and returns
                    a plain-English risk verdict — in under 60 seconds.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-wrap gap-3"
                  >
                    <button
                      onClick={scrollToTool}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-amber-200 active:scale-95"
                    >
                      Analyze your lease
                      <ArrowRight size={16} />
                    </button>
                    <a
                      href="#how-it-works"
                      className="flex items-center gap-2 px-6 py-3 rounded-xl border border-stone-200 hover:border-stone-300 text-stone-600 font-semibold text-sm transition-all"
                    >
                      How it works
                      <ChevronDown size={16} />
                    </a>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-6 pt-2"
                  >
                    {[
                      { v: "510", l: "contracts" },
                      { v: "41",  l: "clauses"   },
                      { v: "99%", l: "accuracy"  },
                    ].map(({ v, l }) => (
                      <div key={l} className="text-center">
                        <div className="text-xl font-bold text-stone-900">{v}</div>
                        <div className="text-xs text-stone-400">{l}</div>
                      </div>
                    ))}
                  </motion.div>
                </div>

                {/* Right — product mockup */}
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                  className="flex justify-center lg:justify-end pr-8"
                >
                  <ProductMockup />
                </motion.div>
              </div>
            </section>

            {/* ── Stats bar ───────────────────────────────────────────────── */}
            <section className="bg-stone-900 py-10">
              <div className="max-w-4xl mx-auto px-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
                  {STATS.map(({ value, label }, i) => (
                    <FadeIn key={label} delay={i * 0.08}>
                      <div className="text-3xl font-bold text-amber-400">{value}</div>
                      <div className="text-xs text-stone-400 mt-1 tracking-wide uppercase">{label}</div>
                    </FadeIn>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Features ────────────────────────────────────────────────── */}
            <section id="features" className="bg-white py-24">
              <div className="max-w-6xl mx-auto px-6">
                <FadeIn className="text-center mb-16">
                  <p className="text-amber-600 text-xs font-bold tracking-widest uppercase mb-3">
                    What LeaseIQ does
                  </p>
                  <h2 className="font-display text-4xl text-stone-900">
                    Everything you need to understand your lease
                  </h2>
                  <p className="text-stone-500 mt-4 max-w-xl mx-auto">
                    Three layers of AI work together so you know exactly what you&apos;re signing.
                  </p>
                </FadeIn>

                <div className="grid md:grid-cols-3 gap-8">
                  {FEATURES.map(({ icon: Icon, color, title, desc }, i) => (
                    <FadeIn key={title} delay={i * 0.12}>
                      <div className="group bg-stone-50 hover:bg-white border border-stone-100 hover:border-stone-200 hover:shadow-lg rounded-2xl p-8 transition-all duration-300 h-full space-y-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                          <Icon size={22} />
                        </div>
                        <h3 className="font-semibold text-stone-900 text-lg">{title}</h3>
                        <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
                      </div>
                    </FadeIn>
                  ))}
                </div>
              </div>
            </section>

            {/* ── How it works ─────────────────────────────────────────────── */}
            <section id="how-it-works" className="bg-stone-50 py-24">
              <div className="max-w-6xl mx-auto px-6">
                <FadeIn className="text-center mb-16">
                  <p className="text-amber-600 text-xs font-bold tracking-widest uppercase mb-3">
                    Simple process
                  </p>
                  <h2 className="font-display text-4xl text-stone-900">
                    Analyze a lease in 3 steps
                  </h2>
                </FadeIn>

                <div className="grid md:grid-cols-3 gap-6 relative">
                  {/* Connector line */}
                  <div className="hidden md:block absolute top-14 left-1/6 right-1/6 h-px bg-stone-200" style={{ left: "18%", right: "18%" }} />

                  {STEPS.map(({ n, icon: Icon, title, desc }, i) => (
                    <FadeIn key={n} delay={i * 0.15}>
                      <div className="relative bg-white border border-stone-100 rounded-2xl p-8 text-center space-y-4 hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 rounded-full bg-amber-600 text-white flex items-center justify-center mx-auto font-bold text-sm shadow-lg shadow-amber-100">
                          {n}
                        </div>
                        <Icon size={28} className="text-stone-300 mx-auto" />
                        <h3 className="font-semibold text-stone-900">{title}</h3>
                        <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
                      </div>
                    </FadeIn>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Risk levels visual ────────────────────────────────────────── */}
            <section className="bg-white py-24">
              <div className="max-w-4xl mx-auto px-6">
                <FadeIn className="text-center mb-12">
                  <h2 className="font-display text-4xl text-stone-900">
                    Plain-English risk verdicts
                  </h2>
                  <p className="text-stone-500 mt-4 max-w-xl mx-auto">
                    No legal jargon. You get a clear tier and a breakdown of exactly why.
                  </p>
                </FadeIn>

                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    {
                      label: "LOW",
                      icon: CheckCircle2,
                      bg: "bg-emerald-50",
                      border: "border-emerald-100",
                      icon_color: "text-emerald-600",
                      text_color: "text-emerald-700",
                      badge_bg: "bg-emerald-600",
                      desc: "All critical clauses present. Standard terms. Safe to proceed — still review with counsel.",
                    },
                    {
                      label: "MEDIUM",
                      icon: AlertTriangle,
                      bg: "bg-amber-50",
                      border: "border-amber-100",
                      icon_color: "text-amber-600",
                      text_color: "text-amber-700",
                      badge_bg: "bg-amber-500",
                      desc: "Some clauses missing or unfavorable. Negotiate before signing.",
                    },
                    {
                      label: "HIGH",
                      icon: XCircle,
                      bg: "bg-red-50",
                      border: "border-red-100",
                      icon_color: "text-red-500",
                      text_color: "text-red-700",
                      badge_bg: "bg-red-500",
                      desc: "Multiple critical clauses absent. Significant exposure. Require revisions.",
                    },
                  ].map(({ label, icon: Icon, bg, border, icon_color, text_color, badge_bg, desc }, i) => (
                    <FadeIn key={label} delay={i * 0.12}>
                      <div className={`${bg} border ${border} rounded-2xl p-6 space-y-4 h-full`}>
                        <div className="flex items-center gap-3">
                          <Icon size={22} className={icon_color} />
                          <span className={`px-2.5 py-0.5 rounded-full text-white text-xs font-bold ${badge_bg}`}>
                            {label} RISK
                          </span>
                        </div>
                        <p className={`text-sm leading-relaxed ${text_color}`}>{desc}</p>
                      </div>
                    </FadeIn>
                  ))}
                </div>
              </div>
            </section>

            {/* ── CTA Banner ───────────────────────────────────────────────── */}
            <section className="bg-stone-900 py-20">
              <div className="max-w-3xl mx-auto px-6 text-center">
                <FadeIn>
                  <h2 className="font-display text-4xl sm:text-5xl text-white mb-6">
                    Ready to review your lease?
                  </h2>
                  <p className="text-stone-400 mb-10 text-lg">
                    Free. No sign-up. Results in under 60 seconds.
                  </p>
                  <button
                    onClick={scrollToTool}
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-base transition-all hover:shadow-xl hover:shadow-amber-900/30 active:scale-95"
                  >
                    Analyze my lease now
                    <ArrowRight size={18} />
                  </button>
                </FadeIn>
              </div>
            </section>

            {/* ── Tool section ─────────────────────────────────────────────── */}
            <section ref={toolRef} className="bg-stone-50 py-24">
              <div className="max-w-2xl mx-auto px-6">
                <FadeIn className="text-center mb-12">
                  <p className="text-amber-600 text-xs font-bold tracking-widest uppercase mb-3">
                    Free analysis
                  </p>
                  <h2 className="font-display text-4xl text-stone-900">
                    Upload your lease
                  </h2>
                  <p className="text-stone-500 mt-3">
                    PDF or text · max 5MB · results in under 60 seconds
                  </p>
                </FadeIn>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8">
                  <UploadZone
                    onResult={setResult}
                    onError={setError}
                    onLoading={setLoading}
                    isLoading={loading}
                  />
                </div>

                <p className="text-center text-xs text-stone-400 mt-6">
                  AI research tool — always have a licensed attorney review before signing.
                </p>
              </div>
            </section>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <footer className="bg-stone-900 py-12 border-t border-stone-800">
              <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <Logo size="sm" />
                <p className="text-stone-500 text-xs text-center">
                  LeaseIQ · AAI-590 Capstone · LegalBERT + XGBoost + Vapi
                </p>
                <p className="text-stone-600 text-xs">
                  Not legal advice. For research use only.
                </p>
              </div>
            </footer>

          </motion.div>
        ) : (

          /* ── Results Dashboard ─────────────────────────────────────────── */
          <motion.div
            key="results"
            variants={resultsContainer}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            className="max-w-6xl mx-auto px-6 py-10 space-y-8"
          >
            <motion.div variants={resultsItem}>
              <RiskBanner
                label={result.risk_label}
                probLow={result.prob_low}
                probMedium={result.prob_medium}
                probHigh={result.prob_high}
                missingCritical={result.missing_high_risk}
              />
            </motion.div>

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
                  initial={{ opacity: 0, scale: 0.85, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 140, damping: 16, delay: 0.15 + i * 0.06 }}
                >
                  <StatCard {...card} />
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={resultsItem} className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2">
                <RiskExplanation result={result} />
              </div>
              <div className="lg:col-span-3">
                <ClauseTable result={result} />
              </div>
            </motion.div>

            {result.contract_excerpt && (
              <motion.div variants={resultsItem}>
                <ContractViewer text={result.contract_excerpt} clauses={result.clauses ?? {}} />
              </motion.div>
            )}

            <motion.div variants={resultsItem}>
              <ComparisonPanel riskLabel={result.risk_label} />
            </motion.div>

            <motion.div variants={resultsItem}>
              <TamPanel />
            </motion.div>

            <motion.div variants={resultsItem}>
              <VoiceButton result={result} />
            </motion.div>

            <motion.div
              variants={resultsItem}
              className="rounded-2xl border border-stone-200 bg-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
            >
              <div>
                <p className="font-semibold text-stone-900">Want a full legal review?</p>
                <p className="text-stone-500 text-sm mt-0.5">
                  This AI report is a starting point. A licensed attorney can negotiate better terms.
                </p>
              </div>
              <button
                onClick={reset}
                className="shrink-0 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-colors"
              >
                Analyze another lease
              </button>
            </motion.div>

            <footer className="pb-10 text-center text-xs text-stone-400">
              LeaseIQ · AI research tool — not legal advice
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ value, label, highlight = false }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 transition-colors ${
      highlight
        ? "bg-red-50 border-red-200"
        : "bg-white border-stone-200 hover:border-stone-300"
    }`}>
      <div className={`text-2xl font-bold tabular-nums ${highlight ? "text-red-600" : "text-stone-900"}`}>
        {value}
      </div>
      <div className="text-xs text-stone-400 mt-0.5">{label}</div>
    </div>
  );
}
