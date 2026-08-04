import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Security headers applied to every response
  async headers() {
    // In dev the browser DevTools panel talks to localhost:8000 directly in some tooling;
    // in production all backend calls go through Next.js API routes so the browser
    // never touches the backend URL — keep CSP tight.
    const connectSrc = isDev
      ? "connect-src 'self' http://localhost:8000 https://*.vapi.ai wss://*.vapi.ai https://*.daily.co wss://*.daily.co https://*.ingest.sentry.io"
      : "connect-src 'self' https://*.vapi.ai wss://*.vapi.ai https://*.daily.co wss://*.daily.co https://*.ingest.sentry.io";

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",        value: "camera=(), microphone=(self), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://c.daily.co",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' https://fonts.gstatic.com",
              connectSrc,
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
