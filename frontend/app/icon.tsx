// Next.js App Router icon convention — generates the browser tab favicon automatically.
// Renders as a 32x32 SVG icon (the LeaseIQ scale mark without wordmark).

import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 900,
          color: "white",
          letterSpacing: "-0.5px",
        }}
      >
        ⚖
      </div>
    ),
    { ...size },
  );
}
