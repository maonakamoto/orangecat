/**
 * Canonical OrangeCat mark geometry (24×24 viewBox).
 * Used by BrandMark, CatIcon, favicon.svg, and orange-cat-logo.svg.
 * Keep paths in sync — do not fork a third variant.
 *
 * Geometry: round head, prominent triangular ears, dot eyes, soft smile.
 * Reads as a cat at 16px favicon and 24px chrome — not a TV with antennae.
 */

export interface BrandMarkIconProps {
  size?: number;
  className?: string;
}

export function BrandMarkIcon({ size = 24, className }: BrandMarkIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      {/* Left ear */}
      <path
        d="M4.5 9 L7 3 L10 8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right ear */}
      <path
        d="M19.5 9 L17 3 L14 8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Round head */}
      <circle cx="12" cy="14" r="6.8" stroke="currentColor" strokeWidth="1.7" />
      {/* Left eye */}
      <circle cx="9.6" cy="13.2" r="1" fill="currentColor" />
      {/* Right eye */}
      <circle cx="14.4" cy="13.2" r="1" fill="currentColor" />
      {/* Tiny nose */}
      <circle cx="12" cy="15.6" r="0.55" fill="currentColor" opacity="0.85" />
      {/* Soft smile */}
      <path
        d="M10.5 17.1 Q12 18.1 13.5 17.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
