"use client";

import { useState } from "react";
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

interface Props {
  result: AnalysisResult;
}

type Filter = "all" | "present" | "missing" | "critical";

export default function ClauseTable({ result }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const clauses = result.clauses ?? {};

  const rows = ALL_CLAUSES
    .filter((c) => c.toLowerCase().includes(search.toLowerCase()))
    .filter((c) => {
      const isPresent = clauses[c]?.present ?? false;
      const isCritical = HIGH_RISK_CLAUSES.includes(c);
      if (filter === "present")  return isPresent;
      if (filter === "missing")  return !isPresent;
      if (filter === "critical") return isCritical;
      return true;
    });

  const presentCount = ALL_CLAUSES.filter((c) => clauses[c]?.present).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
          Clause Analysis · {presentCount}/{ALL_CLAUSES.length} Found
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search clauses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-300 placeholder-zinc-600 outline-none focus:border-indigo-500 w-40"
          />
          {(["all","present","missing","critical"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-2.5 py-1.5 rounded-lg capitalize transition-colors ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="overflow-y-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 sticky top-0 z-10">
              <tr>
                <th className="text-left text-xs text-zinc-500 font-semibold px-4 py-2.5 uppercase tracking-wider">Clause</th>
                <th className="text-center text-xs text-zinc-500 font-semibold px-3 py-2.5 uppercase tracking-wider w-24">Status</th>
                <th className="text-left text-xs text-zinc-500 font-semibold px-4 py-2.5 uppercase tracking-wider">Excerpt</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={3} className="text-center text-zinc-600 py-8 text-sm">No clauses match</td></tr>
              )}
              {rows.map((clause, i) => {
                const info     = clauses[clause];
                const present  = info?.present ?? false;
                const isCrit   = HIGH_RISK_CLAUSES.includes(clause);
                const score    = info?.score ?? 0;

                return (
                  <tr
                    key={clause}
                    className={`border-t border-zinc-800/60 transition-colors hover:bg-zinc-900/50 ${
                      i % 2 === 0 ? "bg-zinc-950" : "bg-zinc-950/70"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {isCrit && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 shrink-0">
                            KEY
                          </span>
                        )}
                        <span className="text-zinc-300 text-xs">{clause}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {present ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-400">
                          <span>✓</span>
                          <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${score * 100}%` }} />
                          </div>
                        </span>
                      ) : (
                        <span className={`text-xs ${isCrit ? "text-red-400 font-semibold" : "text-zinc-600"}`}>
                          {isCrit ? "✗ MISSING" : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 max-w-xs">
                      {present && info?.excerpt ? (
                        <span className="text-xs text-zinc-500 italic line-clamp-2" title={info.excerpt}>
                          "{info.excerpt.slice(0, 100)}{info.excerpt.length > 100 ? "…" : ""}"
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-700">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
