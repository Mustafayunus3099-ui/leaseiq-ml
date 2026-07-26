"use client";

import { motion } from "framer-motion";
import type { RiskLabel } from "@/lib/types";

interface Props {
  riskLabel: RiskLabel;
}

// Estimated attorney cost range based on lease risk level
const ATTORNEY_COST: Record<RiskLabel, string> = {
  HIGH:   "$3,000 – $6,000",
  MEDIUM: "$1,500 – $3,000",
  LOW:    "$800 – $1,500",
};

function Row({ label, ai, attorney }: { label: string; ai: string; attorney: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-[#1e2220] last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xs font-medium text-gold text-center">{ai}</span>
      <span className="text-xs text-paper text-center">{attorney}</span>
    </div>
  );
}

export default function ComparisonPanel({ riskLabel }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 80, damping: 18 }}
      className="rounded-2xl border border-[#1e2220] bg-card overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-[#1e2220]">
        <h3 className="font-display text-lg text-paper">AI vs. Attorney Review</h3>
        <p className="text-xs text-muted mt-0.5">How LeaseIQ compares to a traditional legal review</p>
      </div>

      <div className="px-6 py-5">
        {/* Column headers */}
        <div className="grid grid-cols-3 gap-2 pb-2 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gold text-center">LeaseIQ AI</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted text-center">Attorney</span>
        </div>

        <Row label="Cost"              ai="Free"              attorney={ATTORNEY_COST[riskLabel]} />
        <Row label="Turnaround"        ai="&lt; 60 seconds"   attorney="3 – 10 business days" />
        <Row label="Availability"      ai="24 / 7"            attorney="Business hours" />
        <Row label="Clauses reviewed"  ai="41 categories"     attorney="Full document" />
        <Row label="Plain-English summary" ai="✓"             attorney="Varies by attorney" />
        <Row label="Legally binding advice" ai="✗"            attorney="✓" />
      </div>

      <div className="px-6 pb-5 border-t border-[#1e2220] pt-4">
        <p className="text-[11px] text-muted/60 text-center">
          LeaseIQ surfaces risk — a licensed attorney gives legal advice. Use both.
        </p>
      </div>
    </motion.div>
  );
}
