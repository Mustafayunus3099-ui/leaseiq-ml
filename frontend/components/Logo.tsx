interface Props {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}

const SIZES = {
  sm: { icon: 30, text: "text-lg",  gap: "gap-2"   },
  md: { icon: 38, text: "text-2xl", gap: "gap-2.5" },
  lg: { icon: 54, text: "text-4xl", gap: "gap-3"   },
};

export default function Logo({ size = "md", showWordmark = true }: Props) {
  const s = SIZES[size];

  return (
    <span className={`inline-flex items-center ${s.gap} select-none`}>

      {/* ── Icon mark: amber courthouse + scales ── */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="liq-gold" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
          <linearGradient id="liq-shine" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="48" height="48" rx="11" fill="url(#liq-gold)" />
        <rect width="48" height="28" rx="11" fill="url(#liq-shine)" />

        {/* Pediment (triangular roof) */}
        <path d="M7 21 L24 9 L41 21 Z" fill="white" opacity="0.95" />

        {/* Three columns */}
        <rect x="10" y="21" width="4"   height="14" rx="1" fill="white" />
        <rect x="22" y="21" width="4"   height="14" rx="1" fill="white" />
        <rect x="34" y="21" width="4"   height="14" rx="1" fill="white" />

        {/* Base / plinth steps */}
        <rect x="7"  y="35" width="34" height="3"   rx="1"    fill="white" />
        <rect x="5"  y="38" width="38" height="2.5" rx="0.75" fill="rgba(255,255,255,0.65)" />

        {/* Mini scales of justice inside the pediment */}
        {/* Centre post */}
        <rect x="23.25" y="12" width="1.5" height="6" rx="0.5" fill="url(#liq-gold)" opacity="0.85" />
        {/* Beam */}
        <rect x="17"    y="13" width="14" height="1" rx="0.5" fill="url(#liq-gold)" opacity="0.85" />
        {/* Left pan */}
        <path d="M17 14 Q17.5 17 20 17 Q22.5 17 23 14 Z" fill="url(#liq-gold)" opacity="0.8" />
        {/* Right pan */}
        <path d="M25 14 Q25.5 17 28 17 Q30.5 17 31 14 Z" fill="url(#liq-gold)" opacity="0.8" />
      </svg>

      {/* ── Wordmark ── */}
      {showWordmark && (
        <span className={`font-bold tracking-tight leading-none ${s.text}`}>
          <span className="text-stone-800">Lease</span>
          <span className="text-amber-600">IQ</span>
        </span>
      )}
    </span>
  );
}
