export function AtmosLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="ATMOS">
      <rect width="40" height="40" rx="10" fill="#0f172a" />
      <circle cx="20" cy="20" r="10" stroke="#2563eb" strokeWidth="2" fill="none" opacity="0.6" />
      <circle cx="20" cy="20" r="6"  stroke="#7c3aed" strokeWidth="1.5" fill="none" opacity="0.7" />
      <circle cx="20" cy="20" r="2.5" fill="#2563eb" />
      <path d="M10 20 Q15 14 20 20 Q25 26 30 20" stroke="#059669" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.8" />
    </svg>
  )
}
