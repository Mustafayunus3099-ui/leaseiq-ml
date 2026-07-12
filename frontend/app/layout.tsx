import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LeaseIQ — AI Contract Risk Analyzer",
  description:
    "Upload any commercial lease and get a plain-English risk report in seconds. Powered by LegalBERT fine-tuned on 510 real contracts.",
  keywords: ["lease review", "contract AI", "legal risk", "LegalBERT", "commercial lease"],
  openGraph: {
    title: "LeaseIQ — AI Contract Risk Analyzer",
    description: "Know your lease risks before you sign. AI-powered clause extraction and risk scoring.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-zinc-950 text-zinc-50 antialiased">
        {children}
      </body>
    </html>
  );
}
