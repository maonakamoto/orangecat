/**
 * Compatibility alias for BrandMarkIcon — keeps "CatIcon" import path working.
 * New code should import BrandMarkIcon from '@/components/shell/BrandMarkIcon'.
 */

import { BrandMarkIcon } from '@/components/shell/BrandMarkIcon';

export interface CatIconProps {
  className?: string;
  catColor?: string;
  hatColor?: string;
}

export function CatIcon({ className = '' }: CatIconProps) {
  return <BrandMarkIcon className={className} />;
}

export default CatIcon;
