import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers applied to every response
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options",            value: "DENY" },
          // Stop MIME-type sniffing
          { key: "X-Content-Type-Options",     value: "nosniff" },
          // Force HTTPS (Vercel enforces this anyway, belt-and-suspenders)
          { key: "Strict-Transport-Security",  value: "max-age=63072000; includeSubDomains; preload" },
          // Control referrer information
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          // Permissions policy — no camera/mic/geolocation needed
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js requires unsafe-eval in dev
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // Limit request body size for API routes (5MB)
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
