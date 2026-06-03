/**
 * Canonical OrangeCat mark geometry (24×24 viewBox).
 * Used by BrandMark, CatIcon, favicon.svg, and orange-cat-logo.svg.
 * Keep paths in sync — do not fork a third variant.
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
      <rect
        x="4"
        y="7"
        width="16"
        height="13"
        rx="3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.95"
      />
      <path
        d="M8 7 L7 4 L10 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 7 L17 4 L14 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.5" r="1.25" fill="currentColor" opacity="0.9" />
      <path
        d="M8 13 H16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M9 16 H15"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}
