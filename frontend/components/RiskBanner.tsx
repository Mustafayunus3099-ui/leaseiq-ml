"use client";

import { RISK_COLORS, RISK_ICONS, type RiskLabel } from "@/lib/types";

interface Props {
  label: RiskLabel;
  probLow: number;
  probMedium: number;
  probHigh: number;
  missingCritical: string[];
}

export default function RiskBanner({ label, probLow, probMedium, probHigh, missingCritical }: Props) {
  const c = RISK_COLORS[label];

  return (
    <div className={`w-full rounded-2xl border p-6 ${c.bg} ${c.border} ${c.glow} transition-all`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        {/* Left: risk tier */}
        <div className="flex items-center gap-4">
          <span className={`text-5xl ${label === "HIGH" ? "pulse-high" : ""}`}>
            {RISK_ICONS[label]}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-0.5">Risk Tier</p>
            <h2 className={`text-4xl font-black tracking-tight ${c.text}`}>{label}</h2>
          </div>
        </div>

        {/* Right: probability bars */}
        <div className="flex flex-col gap-2 min-w-[220px]">
          <ProbBar label="LOW"    value={probLow}    color="bg-green-500" />
          <ProbBar label="MEDIUM" value={probMedium} color="bg-amber-500" />
          <ProbBar label="HIGH"   value={probHigh}   color="bg-red-500"   />
        </div>
      </div>

      {/* Missing critical clauses warning */}
      {missingCritical.length > 0 && (
        <div className="mt-4 pt-4 border-t border-red-500/20">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-2">
            ⚠ {missingCritical.length} Critical Clause{missingCritical.length > 1 ? "s" : ""} Missing
          </p>
          <div className="flex flex-wrap gap-2">
            {missingCritical.map((clause) => (
              <span key={clause} className="px-2 py-0.5 rounded-md text-xs bg-red-500/15 text-red-300 border border-red-500/25">
                {clause}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProbBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500 w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-zinc-400 w-10 text-right">{value.toFixed(1)}%</span>
    </div>
  );
}
