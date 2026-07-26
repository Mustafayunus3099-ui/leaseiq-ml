"use client";

import { motion } from "framer-motion";

const STATS = [
  {
    value: "~500K",
    label: "Commercial leases signed per year",
    detail: "US office, retail, and industrial — CoStar Group",
  },
  {
    value: "$2,000",
    label: "Average legal review cost per lease",
    detail: "Mid-market commercial lease review — ABA 2024",
  },
  {
    value: "$1B+",
    label: "Total addressable market",
    detail: "Annual spend on commercial lease legal review",
  },
  {
    value: "~$300M",
    label: "Serviceable market",
    detail: "SMBs without in-house counsel — primary target",
  },
];

export default function TamPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 80, damping: 18 }}
      className="rounded-2xl border border-[#1e2220] bg-card overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-[#1e2220]">
        <h3 className="font-display text-lg text-paper">Market Opportunity</h3>
        <p className="text-xs text-muted mt-0.5">The commercial lease review problem LeaseIQ solves</p>
      </div>

      <div className="p-6 grid sm:grid-cols-2 gap-4">
        {STATS.map(({ value, label, detail }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.07, type: "spring", stiffness: 120, damping: 18 }}
            className="rounded-xl border border-[#1e2220] bg-lift/50 p-4 space-y-1"
          >
            <div className="text-2xl font-bold text-gold tabular-nums">{value}</div>
            <div className="text-xs font-medium text-paper leading-snug">{label}</div>
            <div className="text-[11px] text-muted leading-relaxed">{detail}</div>
          </motion.div>
        ))}
      </div>

      <div className="px-6 pb-5 border-t border-[#1e2220] pt-4">
        <p className="text-[11px] text-muted/60 text-center">
          Sources: CoStar Group, American Bar Association — US commercial market estimates 2024
        </p>
      </div>
    </motion.div>
  );
}
