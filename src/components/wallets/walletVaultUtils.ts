import { Bitcoin, Zap, Users, Building, Heart } from 'lucide-react';
import { truncateAddress as truncateAddressUtil } from '@/utils/string';
import { BADGE_COLORS } from '@/config/badge-colors';
import type { WalletAddress } from './WalletVault';

export function getTypeIconName(
  type: WalletAddress['type']
): 'Bitcoin' | 'Zap' | 'Ethereum' | 'Solana' | 'Other' {
  switch (type) {
    case 'bitcoin':
      return 'Bitcoin';
    case 'lightning':
      return 'Zap';
    case 'ethereum':
      return 'Ethereum';
    case 'solana':
      return 'Solana';
    default:
      return 'Other';
  }
}

export function getLucideTypeIcon(type: WalletAddress['type']) {
  switch (type) {
    case 'bitcoin':
      return Bitcoin;
    case 'lightning':
      return Zap;
    default:
      return null; // ethereum/solana use text symbols, handled in TSX
  }
}

export function getCategoryIcon(category: WalletAddress['category']) {
  switch (category) {
    case 'organization':
    case 'business':
      return Building;
    case 'project':
    case 'donation':
      return Heart;
    case 'personal':
    case 'friend':
    default:
      return Users;
  }
}

export function getCategoryColor(category: WalletAddress['category']): string {
  switch (category) {
    case 'personal':
      return BADGE_COLORS.info;
    case 'organization':
      return BADGE_COLORS.purple;
    case 'project':
      return BADGE_COLORS.pink;
    case 'friend':
      return BADGE_COLORS.success;
    case 'business':
      return BADGE_COLORS.orange;
    case 'donation':
      return BADGE_COLORS.error;
    default:
      return BADGE_COLORS.neutral;
  }
}

export function formatAddress(address: string): string {
  return truncateAddressUtil(address, 10, 8);
}
