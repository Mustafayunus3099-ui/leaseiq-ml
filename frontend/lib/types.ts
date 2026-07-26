export type RiskLabel = "LOW" | "MEDIUM" | "HIGH";

export interface ClauseResult {
  present: boolean;
  excerpt: string;
  score: number;
}

export interface AnalysisResult {
  risk_label: RiskLabel;
  prob_low: number;
  prob_medium: number;
  prob_high: number;
  missing_high_risk: string[];
  present_high_risk: string[];
  top_risk_drivers: Record<string, number>;
  clauses: Record<string, ClauseResult>;
  contract_excerpt?: string;
}

export const RISK_COLORS: Record<RiskLabel, { bg: string; text: string; border: string; glow: string }> = {
  HIGH:   { bg: "bg-red-500/10",   text: "text-red-400",   border: "border-red-500/40",   glow: "glow-high"   },
  MEDIUM: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/40", glow: "glow-medium" },
  LOW:    { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/40", glow: "glow-low"    },
};

export const RISK_ICONS: Record<RiskLabel, string> = {
  HIGH:   "🔴",
  MEDIUM: "🟡",
  LOW:    "🟢",
};

export const HIGH_RISK_CLAUSES = [
  "Cap On Liability",
  "Governing Law",
  "Anti-Assignment",
  "Termination For Convenience",
  "Notice Period To Terminate Renewal",
];

// Pre-computed demo result for a high-risk lease
export const DEMO_RESULT: AnalysisResult = {
  risk_label: "HIGH",
  prob_low: 4.1,
  prob_medium: 17.8,
  prob_high: 78.1,
  missing_high_risk: ["Cap On Liability", "Notice Period To Terminate Renewal", "Governing Law"],
  present_high_risk: ["Anti-Assignment", "Termination For Convenience"],
  top_risk_drivers: {
    "Cap On Liability":                 -2.14,
    "Notice Period To Terminate Renewal": -1.31,
    "Governing Law":                    -0.98,
    "Anti-Assignment":                   0.82,
    "Termination For Convenience":       0.61,
    "Renewal Term":                     -0.22,
    "Insurance":                        -0.18,
    "License Grant":                    -0.09,
    "Exclusivity":                       0.07,
    "Non-Compete":                       0.06,
  },
  clauses: {
    "Anti-Assignment":                   { present: true,  score: 0.87, excerpt: "Tenant shall not assign this Agreement or sublet the Premises without the prior written consent of Landlord." },
    "Termination For Convenience":       { present: true,  score: 0.79, excerpt: "Landlord may terminate this Lease at any time upon sixty (60) days written notice to Tenant." },
    "Cap On Liability":                  { present: false, score: 0.0,  excerpt: "" },
    "Governing Law":                     { present: false, score: 0.0,  excerpt: "" },
    "Notice Period To Terminate Renewal":{ present: false, score: 0.0,  excerpt: "" },
    "Insurance":                         { present: true,  score: 0.74, excerpt: "Tenant shall maintain commercial general liability insurance with limits of not less than $1,000,000 per occurrence." },
    "Renewal Term":                      { present: true,  score: 0.68, excerpt: "Tenant shall have the option to renew this Lease for one additional term of two (2) years." },
    "Agreement Date":                    { present: true,  score: 0.95, excerpt: "January 15, 2024" },
    "Parties":                           { present: true,  score: 0.91, excerpt: "Landlord Corp., a Delaware corporation and TechStart Inc., a California corporation." },
    "Expiration Date":                   { present: true,  score: 0.83, excerpt: "January 31, 2026" },
  },
  contract_excerpt: `COMMERCIAL LEASE AGREEMENT

This Commercial Lease Agreement is entered into as of January 15, 2024, by and between Landlord Corp., a Delaware corporation ("Landlord"), and TechStart Inc., a California corporation ("Tenant").

PREMISES. Landlord hereby leases to Tenant the premises located at 123 Main Street, San Francisco, CA 94105, comprising approximately 2,500 square feet on the 4th floor.

TERM. The initial term shall commence February 1, 2024 and expire January 31, 2026.

RENEWAL. Tenant shall have the option to renew this Lease for one additional term of two (2) years by providing written notice.

ASSIGNMENT. Tenant shall not assign this Agreement or sublet the Premises without the prior written consent of Landlord.

TERMINATION. Landlord may terminate this Lease at any time upon sixty (60) days written notice to Tenant.

INSURANCE. Tenant shall maintain commercial general liability insurance with limits of not less than $1,000,000 per occurrence.`,
};
