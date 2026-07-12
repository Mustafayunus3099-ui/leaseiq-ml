/**
 * LeaseIQ Logo component.
 * Renders the icon mark + wordmark inline using the page font (no external assets needed).
 * Use size="sm" in the nav, size="lg" for hero/splash.
 */

interface Props {
  size?: "sm" | "md" | "lg";
  /** Show wordmark next to the icon (default true) */
  showWordmark?: boolean;
}

const SIZES = {
  sm: { icon: 28, text: "text-lg",  gap: "gap-2" },
  md: { icon: 36, text: "text-2xl", gap: "gap-2.5" },
  lg: { icon: 52, text: "text-4xl", gap: "gap-3" },
};

export default function Logo({ size = "md", showWordmark = true }: Props) {
  const s = SIZES[size];

  return (
    <span className={`inline-flex items-center ${s.gap} select-none`}>
      {/* ── Icon mark ── */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="liq-bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="liq-shine" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="48" height="48" rx="12" fill="url(#liq-bg)" />
        <rect width="48" height="24" rx="12" fill="url(#liq-shine)" />

        {/* Center vertical post */}
        <rect x="23.25" y="9" width="1.5" height="24" rx="0.75" fill="white" />

        {/* Horizontal beam */}
        <rect x="9" y="15.5" width="30" height="1.5" rx="0.75" fill="white" />

        {/* Left chain */}
        <rect x="12.25" y="17" width="1.5" height="6" rx="0.75" fill="rgba(255,255,255,0.8)" />
        {/* Left pan */}
        <path d="M8.5 23 Q9 27.5 13 27.5 Q17 27.5 17.5 23 Z" fill="white" opacity="0.9" />
        <rect x="8.5" y="22.5" width="9" height="1" rx="0.5" fill="white" />

        {/* Right chain (longer — imbalance signals risk) */}
        <rect x="34.25" y="17" width="1.5" height="8" rx="0.75" fill="rgba(255,255,255,0.7)" />
        {/* Right pan (lower) */}
        <path d="M30.5 25 Q31 29.5 35 29.5 Q39 29.5 39.5 25 Z" fill="rgba(255,255,255,0.7)" />
        <rect x="30.5" y="24.5" width="9" height="1" rx="0.5" fill="rgba(255,255,255,0.75)" />

        {/* Fulcrum base */}
        <rect x="18" y="33" width="12" height="1.5" rx="0.75" fill="rgba(255,255,255,0.7)" />
        <rect x="22" y="32" width="4" height="1.5" rx="0.75" fill="rgba(255,255,255,0.85)" />

        {/* Circuit dots at beam tips */}
        <circle cx="9.75" cy="16.25" r="2.25" fill="white" opacity="0.9" />
        <circle cx="38.25" cy="16.25" r="2.25" fill="rgba(255,255,255,0.65)" />

        {/* Pivot dot (indigo accent) */}
        <circle cx="24" cy="16.25" r="2" fill="#a5b4fc" />
      </svg>

      {/* ── Wordmark ── */}
      {showWordmark && (
        <span className={`font-bold tracking-tight leading-none ${s.text}`}>
          <span className="text-zinc-100">Lease</span>
          <span className="text-indigo-400">IQ</span>
        </span>
      )}
    </span>
  );
}
