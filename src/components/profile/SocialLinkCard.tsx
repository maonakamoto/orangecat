'use client';

import { Button } from '@/components/ui/Button';
import { SocialLink } from '@/types/social';
import { getPlatformById } from '@/lib/social-platforms';
import { X, Edit2, Trash2 } from 'lucide-react';

interface SocialLinkCardProps {
  link: SocialLink;
  onEdit: () => void;
  onDelete: () => void;
}

export function SocialLinkCard({ link, onEdit, onDelete }: SocialLinkCardProps) {
  const platform = getPlatformById(link.platform);
  const Icon = platform?.icon || X;
  const displayLabel = link.platform === 'custom' ? link.label : platform?.label || link.platform;
  const displayValue = link.value;

  return (
    <div className="flex items-center justify-between p-3 border border-border rounded-lg hover:border-border-strong transition-colors bg-muted">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{displayLabel}</div>
          <div className="text-xs text-muted-foreground truncate">{displayValue}</div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button onClick={onEdit} variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button
          onClick={onDelete}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
