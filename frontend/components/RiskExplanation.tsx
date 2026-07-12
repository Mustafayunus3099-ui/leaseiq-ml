"use client";

import type { AnalysisResult } from "@/lib/types";

const CLAUSE_PLAIN: Record<string, string> = {
  "Cap On Liability":                  "limits on how much you can be sued for",
  "Governing Law":                     "which state's laws apply to disputes",
  "Anti-Assignment":                   "restrictions on transferring the lease",
  "Termination For Convenience":       "landlord's right to end the lease early",
  "Notice Period To Terminate Renewal":"required notice before renewal kicks in",
  "Insurance":                         "required insurance coverage",
  "Renewal Term":                      "automatic renewal provisions",
  "Audit Rights":                      "right to audit financial records",
  "Non-Compete":                       "restrictions on competing businesses",
};

interface Props {
  result: AnalysisResult;
}

export default function RiskExplanation({ result }: Props) {
  const { risk_label, missing_high_risk, present_high_risk, top_risk_drivers } = result;

  // Build plain-English risk narrative
  const missing = missing_high_risk.map((c) => CLAUSE_PLAIN[c] ?? c.toLowerCase());
  const present = present_high_risk.map((c) => CLAUSE_PLAIN[c] ?? c.toLowerCase());

  // Top 5 SHAP drivers sorted by absolute impact
  const topDrivers = Object.entries(top_risk_drivers)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
        Why This Risk Score?
      </h3>

      {/* Plain-English narrative */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
        {risk_label === "HIGH" && (
          <p className="text-zinc-200 text-sm leading-relaxed">
            This contract is <span className="text-red-400 font-semibold">high risk</span> because it is missing{" "}
            {missing.length} critical protective clause{missing.length !== 1 ? "s" : ""}
            {missing.length > 0 ? `: ${missing.join(", ")}` : ""}.
            Without these clauses, your exposure is uncapped and the landlord holds most of the leverage.
          </p>
        )}
        {risk_label === "MEDIUM" && (
          <p className="text-zinc-200 text-sm leading-relaxed">
            This contract carries <span className="text-amber-400 font-semibold">moderate risk</span>.
            {missing.length > 0
              ? ` It is missing ${missing.join(", ")}, which should be negotiated before signing.`
              : " Most standard clauses are present, but review the details carefully."}
          </p>
        )}
        {risk_label === "LOW" && (
          <p className="text-zinc-200 text-sm leading-relaxed">
            This contract is <span className="text-green-400 font-semibold">low risk</span>.
            {present.length > 0
              ? ` Key protections are present: ${present.join(", ")}.`
              : " Standard protective clauses appear to be included."}
            {" "}Still have a lawyer review before signing.
          </p>
        )}

        {present.length > 0 && risk_label !== "LOW" && (
          <p className="text-zinc-400 text-sm">
            ✓ These protective clauses were found: {present.join(", ")}.
          </p>
        )}
      </div>

      {/* SHAP feature importance */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Top Risk Drivers</p>
        <div className="space-y-2">
          {topDrivers.map(([clause, shap]) => {
            const isRisk = shap < 0; // negative SHAP = pushes toward HIGH risk
            const pct = Math.min(Math.abs(shap) * 40, 100);
            return (
              <div key={clause} className="flex items-center gap-3">
                <span className={`text-xs w-4 ${isRisk ? "text-red-400" : "text-green-400"}`}>
                  {isRisk ? "↑" : "↓"}
                </span>
                <span className="text-xs text-zinc-300 flex-1 truncate" title={clause}>{clause}</span>
                <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isRisk ? "bg-red-500" : "bg-green-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-zinc-600 mt-3">
          ↑ increases risk score · ↓ reduces risk score · powered by SHAP
        </p>
      </div>
    </div>
  );
}
