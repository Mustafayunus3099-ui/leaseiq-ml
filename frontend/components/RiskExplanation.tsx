"use client";

import { motion } from "framer-motion";
import type { AnalysisResult } from "@/lib/types";

// Human-readable descriptions for the five critical clauses
const CLAUSE_PLAIN: Record<string, string> = {
  "Cap On Liability":                   "limits on how much you can be sued for",
  "Governing Law":                      "which state's laws apply to disputes",
  "Anti-Assignment":                    "restrictions on transferring the lease",
  "Termination For Convenience":        "landlord's right to end the lease early",
  "Notice Period To Terminate Renewal": "required notice before renewal kicks in",
  "Insurance":                          "required insurance coverage",
  "Renewal Term":                       "automatic renewal provisions",
  "Audit Rights":                       "right to audit financial records",
  "Non-Compete":                        "restrictions on competing businesses",
};

export default function RiskExplanation({ result }: { result: AnalysisResult }) {
  const { risk_label, missing_high_risk, present_high_risk, top_risk_drivers } = result;

  const missing = missing_high_risk.map((c) => CLAUSE_PLAIN[c] ?? c.toLowerCase());
  const present  = present_high_risk.map((c) => CLAUSE_PLAIN[c] ?? c.toLowerCase());

  const topDrivers = Object.entries(top_risk_drivers)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 5);

  const riskColor = { HIGH: "text-stamp", MEDIUM: "text-warn", LOW: "text-seal" }[risk_label];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 80, damping: 18 }}
      className="rounded-2xl border border-[#1e2220] bg-card overflow-hidden h-full"
    >
      <div className="px-6 py-4 border-b border-[#1e2220]">
        <h3 className="font-display text-lg text-paper">Why This Score?</h3>
        <p className="text-xs text-muted mt-0.5">Plain-English breakdown of your risk verdict</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Narrative */}
        <div className="rounded-xl bg-lift/50 border border-[#1e2220] p-4">
          {risk_label === "HIGH" && (
            <p className="text-paper text-sm leading-relaxed">
              This contract is <span className={`${riskColor} font-semibold`}>high risk</span> — it is
              missing {missing.length} critical protective clause{missing.length !== 1 ? "s" : ""}
              {missing.length > 0 ? `: ${missing.join(", ")}` : ""}.
              Without these, your exposure is uncapped and the landlord holds the leverage.
            </p>
          )}
          {risk_label === "MEDIUM" && (
            <p className="text-paper text-sm leading-relaxed">
              This contract carries <span className={`${riskColor} font-semibold`}>moderate risk</span>.
              {missing.length > 0
                ? ` Missing: ${missing.join(", ")} — negotiate these before signing.`
                : " Most standard clauses are present, but review the details carefully."}
            </p>
          )}
          {risk_label === "LOW" && (
            <p className="text-paper text-sm leading-relaxed">
              This contract is <span className={`${riskColor} font-semibold`}>low risk</span>.
              {present.length > 0
                ? ` Key protections found: ${present.join(", ")}.`
                : " Standard protective clauses appear to be included."}
              {" "}Still have a lawyer review before signing.
            </p>
          )}

          {present.length > 0 && risk_label !== "LOW" && (
            <p className="text-muted text-xs mt-3 pt-3 border-t border-[#1e2220]">
              ✓ Protective clauses present: {present.join(", ")}.
            </p>
          )}
        </div>

        {/* SHAP drivers */}
        <div className="rounded-xl bg-lift/50 border border-[#1e2220] p-4">
          <p className="text-[10px] text-muted uppercase tracking-[0.18em] font-semibold mb-3">Top Risk Drivers</p>
          <div className="space-y-2.5">
            {topDrivers.map(([clause, shap], i) => {
              const isRisk = shap < 0;
              const pct    = Math.min(Math.abs(shap) * 40, 100);
              return (
                <motion.div
                  key={clause}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.06, duration: 0.25 }}
                  className="flex items-center gap-3"
                >
                  <span className={`text-xs w-4 shrink-0 ${isRisk ? "text-stamp" : "text-seal"}`}>
                    {isRisk ? "↑" : "↓"}
                  </span>
                  <span className="text-xs text-paper flex-1 truncate" title={clause}>{clause}</span>
                  <div className="w-16 h-1.5 bg-lift rounded-full overflow-hidden shrink-0">
                    <motion.div
                      className={`h-full rounded-full ${isRisk ? "bg-stamp" : "bg-seal"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 + i * 0.06 }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted/50 mt-3 pt-3 border-t border-[#1e2220]">
            ↑ increases risk · ↓ reduces risk · powered by SHAP
          </p>
        </div>
      </div>
    </motion.div>
  );
}
