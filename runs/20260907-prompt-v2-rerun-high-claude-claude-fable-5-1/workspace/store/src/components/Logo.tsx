export function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="47" fill="#f4e7c9" stroke="#2a1f2d" strokeWidth="5" />
      <circle cx="50" cy="50" r="38" fill="#e9843c" />
      <circle cx="62" cy="36" r="9" fill="#fff0c0" />
      <polygon points="12,72 34,42 48,62 58,50 88,72" fill="#8c2f39" />
      <polygon points="12,72 26,58 40,72" fill="#3b1d2e" />
      <rect x="12" y="70" width="76" height="12" fill="#2a1f2d" />
      <rect x="40" y="26" width="3" height="46" fill="#2a1f2d" />
      <rect x="35" y="30" width="13" height="2.5" fill="#2a1f2d" />
      <path d="M 36 32 Q 62 44 90 30" stroke="#2a1f2d" strokeWidth="1.6" fill="none" />
    </svg>
  );
}
