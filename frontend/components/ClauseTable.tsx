"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AnalysisResult } from "@/lib/types";
import { HIGH_RISK_CLAUSES } from "@/lib/types";

const ALL_CLAUSES = [
  "Affiliate License-Licensee","Affiliate License-Licensor","Agreement Date",
  "Anti-Assignment","Audit Rights","Cap On Liability","Change Of Control",
  "Competitive Restriction Exception","Covenant Not To Sue","Document Name",
  "Effective Date","Exclusivity","Expiration Date","Governing Law",
  "Insurance","Ip Ownership Assignment","Irrevocable Or Perpetual License",
  "Joint Ip Ownership","License Grant","Liquidated Damages",
  "Minimum Commitment","Most Favored Nation","No-Solicit Of Customers",
  "No-Solicit Of Employees","Non-Compete","Non-Disparagement",
  "Non-Transferable License","Notice Period To Terminate Renewal","Parties",
  "Post-Termination Services","Price Restrictions","Renewal Term",
  "Revenue/Profit Sharing","Rofr/Rofo/Rofn","Source Code Escrow",
  "Termination For Convenience","Third Party Beneficiary",
  "Uncapped Liability","Unlimited/All-You-Can-Eat-License",
  "Volume Restriction","Warranty Duration",
];

type Filter = "all" | "present" | "missing" | "critical";

export default function ClauseTable({ result }: { result: AnalysisResult }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const clauses = result.clauses ?? {};

  const rows = ALL_CLAUSES
    .filter((c) => c.toLowerCase().includes(search.toLowerCase()))
    .filter((c) => {
      const present  = clauses[c]?.present ?? false;
      const critical = HIGH_RISK_CLAUSES.includes(c);
      if (filter === "present")  return present;
      if (filter === "missing")  return !present;
      if (filter === "critical") return critical;
      return true;
    });

  const presentCount = ALL_CLAUSES.filter((c) => clauses[c]?.present).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 80, damping: 18 }}
      className="rounded-2xl border border-[#1e2220] bg-card overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-[#1e2220] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg text-paper">Clause Analysis</h3>
          <p className="text-xs text-muted mt-0.5">{presentCount} of {ALL_CLAUSES.length} clauses found</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs bg-lift border border-[#1e2220] rounded-lg px-3 py-1.5 text-paper placeholder-muted outline-none focus:border-gold/50 w-32 transition-colors"
          />
          {(["all", "present", "missing", "critical"] as Filter[]).map((f) => (
            <motion.button
              key={f}
              whileTap={{ scale: 0.93 }}
              onClick={() => setFilter(f)}
              className={`text-xs px-2.5 py-1.5 rounded-lg capitalize transition-colors ${
                filter === f
                  ? "bg-gold text-ink font-semibold"
                  : "bg-lift text-muted hover:text-paper border border-[#1e2220]"
              }`}
            >
              {f}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto max-h-96">
        <table className="w-full text-sm">
          <thead className="bg-lift sticky top-0 z-10 border-b border-[#1e2220]">
            <tr>
              <th className="text-left text-[10px] text-muted font-semibold px-4 py-2.5 uppercase tracking-wider">Clause</th>
              <th className="text-center text-[10px] text-muted font-semibold px-3 py-2.5 uppercase tracking-wider w-28">Status</th>
              <th className="text-left text-[10px] text-muted font-semibold px-4 py-2.5 uppercase tracking-wider">Excerpt</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-muted py-8 text-sm">No clauses match</td>
              </tr>
            )}
            <AnimatePresence initial={false}>
              {rows.map((clause, i) => {
                const info     = clauses[clause];
                const present  = info?.present ?? false;
                const critical = HIGH_RISK_CLAUSES.includes(clause);
                const score    = info?.score ?? 0;

                return (
                  <motion.tr
                    key={clause}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.35), duration: 0.22 }}
                    className="border-t border-[#1e2220]/60 hover:bg-lift/40 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {critical && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/25 shrink-0 font-medium">
                            KEY
                          </span>
                        )}
                        <span className="text-paper text-xs">{clause}</span>
                      </div>
                    </td>

                    <td className="px-3 py-2.5 text-center">
                      {present ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-seal">
                          <span>✓</span>
                          <div className="w-10 h-1 bg-lift rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-seal rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${score * 100}%` }}
                              transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.015 }}
                            />
                          </div>
                        </span>
                      ) : (
                        <span className={`text-xs ${critical ? "text-stamp font-semibold" : "text-muted"}`}>
                          {critical ? "✗ MISSING" : "—"}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-2.5 max-w-xs">
                      {present && info?.excerpt ? (
                        <span className="text-xs text-muted italic line-clamp-2" title={info.excerpt}>
                          &ldquo;{info.excerpt.slice(0, 100)}{info.excerpt.length > 100 ? "…" : ""}&rdquo;
                        </span>
                      ) : (
                        <span className="text-xs text-muted/40">—</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
