/**
 * Centralized Theme System for OrangeCat
 *
 * This file provides semantic color naming and eliminates hardcoded color values.
 * All Bitcoin-related UI elements should use semantic names from this system.
 *
 * Created: June 5, 2025
 * Last Modified: June 5, 2025
 * Last Modified Summary: Initial creation of centralized theme system
 */

// Design tokens - single source of truth for colors
export const colors = {
  // Primary brand colors
  primary: {
    main: '#0ABAB5', // Tiffany Blue
    light: '#E6F7F7',
    dark: '#089B96',
  },

  // Bitcoin-specific colors
  bitcoin: {
    main: '#F7931A', // Official Bitcoin Orange
    light: '#FFF5F0', // Light background for Bitcoin elements
    dark: '#CC5200', // Darker shade for hover states
  },

  // Secondary colors
  secondary: {
    main: '#FF6B35', // General orange (non-Bitcoin)
    light: '#FFF0EB',
    dark: '#E65A2F',
  },

  // Status colors
  status: {
    success: '#059669',
    error: '#DC2626',
    warning: '#F59E0B',
    info: '#3B82F6',
  },

  // Neutral colors
  neutral: {
    white: '#FFFFFF',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
    black: '#000000',
  },
} as const;

// Tailwind class generators for consistent usage
const getColorClasses = {
  bitcoin: {
    background: 'bg-bitcoinOrange/10',
    text: 'text-bitcoinOrange',
    border: 'border-bitcoinOrange',
    hover: 'hover:bg-bitcoinOrange hover:text-white',
    icon: 'text-bitcoinOrange',
    badge: 'bg-bitcoinOrange/10 text-bitcoinOrange border-bitcoinOrange/20',
  },

  primary: {
    background: 'bg-tiffany-500',
    text: 'text-tiffany-500',
    border: 'border-tiffany-500',
    hover: 'hover:bg-tiffany-600',
    button: 'bg-tiffany-500 hover:bg-tiffany-600 text-white',
  },

  status: (status: 'success' | 'error' | 'warning' | 'info') => ({
    background: `bg-${status === 'success' ? 'green' : status === 'error' ? 'red' : status === 'warning' ? 'yellow' : 'blue'}-100`,
    text: `text-${status === 'success' ? 'green' : status === 'error' ? 'red' : status === 'warning' ? 'yellow' : 'blue'}-600`,
    border: `border-${status === 'success' ? 'green' : status === 'error' ? 'red' : status === 'warning' ? 'yellow' : 'blue'}-200`,
  }),
} as const;

// Component-specific color schemes
export const componentColors = {
  // Bitcoin-related components
  bitcoinElement: {
    className: 'bg-bitcoinOrange/10 text-bitcoinOrange border-bitcoinOrange/20',
    style: {
      backgroundColor: colors.bitcoin.light,
      color: colors.bitcoin.main,
      borderColor: colors.bitcoin.main,
    },
  },

  // Currency display
  currencyDisplay: (currency: 'BTC' | 'USD' | 'CHF' | string) => ({
    className: currency === 'BTC' ? 'text-bitcoinOrange font-medium' : 'text-gray-600',
    style: {
      color: currency === 'BTC' ? colors.bitcoin.main : colors.neutral.gray600,
    },
  }),

  // Status badges
  statusBadge: (status: string) => {
    if (status.toLowerCase().includes('bitcoin') || status.toLowerCase().includes('btc')) {
      return getColorClasses.bitcoin.badge;
    }
    return 'bg-gray-100 text-gray-600 border-gray-200';
  },
} as const;
