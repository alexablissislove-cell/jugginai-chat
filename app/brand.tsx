export function Mark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="jm-tile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24242e" />
          <stop offset="1" stopColor="#0c0c11" />
        </linearGradient>
        <radialGradient id="jm-ball" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffd2a8" />
          <stop offset="0.35" stopColor="#ff9a4d" />
          <stop offset="1" stopColor="#e2500f" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="62" height="62" rx="17" fill="url(#jm-tile)" />
      <rect x="1.5" y="1.5" width="61" height="61" rx="16.5" fill="none" stroke="#fff" strokeOpacity="0.09" />
      <ellipse cx="32" cy="32" rx="18" ry="9.5" transform="rotate(-28 32 32)" fill="none" stroke="#ff6a2b" strokeOpacity="0.38" strokeWidth="1.6" />
      <circle cx="33.6" cy="41.7" r="3.6" fill="url(#jm-ball)" opacity="0.6" />
      <circle cx="44.5" cy="20.8" r="5" fill="url(#jm-ball)" opacity="0.85" />
      <circle cx="15.7" cy="36.1" r="7.5" fill="url(#jm-ball)" />
      <circle cx="13.299999999999999" cy="33.5" r="2" fill="#fff" opacity="0.5" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-[3px] leading-none ${className}`}>
      <span className="font-display text-[1.32em] italic tracking-[-0.01em] text-bone">Juggin</span>
      <span className="text-[0.72em] font-semibold tracking-[0.14em] text-ember">AI</span>
    </span>
  );
}
