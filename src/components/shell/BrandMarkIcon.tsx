/**
 * Canonical OrangeCat mark geometry (24×24 viewBox).
 * Used by BrandMark, CatIcon, favicon.svg, and orange-cat-logo.svg.
 * Keep paths in sync — do not fork a third variant.
 *
 * Geometry: round head with filled triangular ears whose bases OVERLAP
 * the head circle (so ears emerge from the silhouette instead of floating
 * above it like horns), eye dots, tiny nose, soft smile, two pairs of
 * whiskers per side. Reads as a cat at 16px favicon and 24px chrome.
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
      {/* Left ear — filled, base overlaps head circle */}
      <path d="M7 11 L8.5 4.5 L11 9 Z" fill="currentColor" />
      {/* Right ear — filled, base overlaps head circle */}
      <path d="M17 11 L15.5 4.5 L13 9 Z" fill="currentColor" />
      {/* Round head — stroked outline */}
      <circle cx="12" cy="14" r="6" stroke="currentColor" strokeWidth="1.6" />
      {/* Eyes */}
      <circle cx="9.6" cy="13.4" r="0.95" fill="currentColor" />
      <circle cx="14.4" cy="13.4" r="0.95" fill="currentColor" />
      {/* Nose */}
      <circle cx="12" cy="15.6" r="0.5" fill="currentColor" opacity="0.9" />
      {/* Soft smile */}
      <path
        d="M10.5 17 Q12 18.1 13.5 17"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Whiskers — left */}
      <path
        d="M2.5 14.5 L6 14.8 M2.5 16.5 L6 16.4"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      {/* Whiskers — right */}
      <path
        d="M21.5 14.5 L18 14.8 M21.5 16.5 L18 16.4"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
