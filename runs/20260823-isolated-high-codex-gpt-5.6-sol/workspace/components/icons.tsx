export function ClockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7.5v5l3.2 1.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
