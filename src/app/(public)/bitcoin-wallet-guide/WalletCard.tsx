'use client';

import { motion } from 'framer-motion';
import { Bitcoin, Smartphone, Monitor, Globe, Lock, Star, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import type { WalletOption } from './config';

function getTypeIcon(type: WalletOption['type']) {
  switch (type) {
    case 'mobile':
      return Smartphone;
    case 'desktop':
      return Monitor;
    case 'browser':
      return Globe;
    case 'hardware':
      return Lock;
    default:
      return Bitcoin;
  }
}

function getDifficultyColor(difficulty: WalletOption['difficulty']) {
  switch (difficulty) {
    case 'beginner':
      return 'border-status-positive/25 bg-status-positive/10 text-status-positive';
    case 'intermediate':
      return 'border-warning/30 bg-status-warning/10 text-fg-primary';
    case 'advanced':
      return 'border-status-negative/25 bg-status-negative/10 text-status-negative';
    default:
      return 'text-fg-secondary bg-surface-raised border-default';
  }
}

interface WalletCardProps {
  wallet: WalletOption;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function WalletCard({ wallet, isSelected, onSelect }: WalletCardProps) {
  const TypeIcon = getTypeIcon(wallet.type);

  return (
    <motion.div layout whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Card
        className={`cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'ring-2 ring-bitcoinOrange border-bitcoinOrange'
            : 'oc-card-link border-default'
        } ${wallet.recommended ? 'ring-1 ring-success/20 bg-status-positive/5' : ''}`}
        onClick={() => onSelect(wallet.id)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${isSelected ? 'bg-bitcoinOrange/10 text-bitcoinOrange border-bitcoinOrange/20' : 'bg-surface-raised'}`}
              >
                <TypeIcon
                  className={`w-5 h-5 ${isSelected ? 'text-bitcoinOrange' : 'text-fg-secondary'}`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{wallet.name}</CardTitle>
                  {wallet.recommended && (
                    <div className="flex items-center gap-1 rounded-md border border-status-positive/20 bg-status-positive/10 px-2 py-1 text-xs font-medium text-status-positive">
                      <Star className="w-3 h-3" />
                      Recommended
                    </div>
                  )}
                </div>
                <div
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(wallet.difficulty)}`}
                >
                  {wallet.difficulty.charAt(0).toUpperCase() + wallet.difficulty.slice(1)}
                </div>
              </div>
            </div>
            <ChevronRight
              className={`w-5 h-5 transition-transform ${isSelected ? 'rotate-90 text-bitcoinOrange' : 'text-fg-tertiary'}`}
            />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <CardDescription className="mb-4">{wallet.description}</CardDescription>
          <div className="flex flex-wrap gap-2 mb-4">
            {wallet.features.map(feature => (
              <span
                key={feature}
                className="px-2 py-1 bg-surface-raised text-fg-primary rounded-full text-xs"
              >
                {feature}
              </span>
            ))}
          </div>
          <div className="text-sm text-fg-secondary">
            <strong>Platforms:</strong> {wallet.supportedPlatforms.join(', ')}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
