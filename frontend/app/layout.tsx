import type { Metadata } from "next";
import { DM_Serif_Display, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

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
    <html lang="en" className={`${dmSerif.variable} ${ibmMono.variable}`}>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
