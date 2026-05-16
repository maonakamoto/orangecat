'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SocialLink } from '@/types/social';
import {
  getPlatformById,
  getPredefinedPlatforms,
  type SocialPlatformId,
} from '@/lib/social-platforms';
import { X } from 'lucide-react';

interface SocialLinkFormProps {
  initialLink?: SocialLink;
  onSubmit: (link: SocialLink) => void;
  onCancel: () => void;
  existingPlatforms?: SocialPlatformId[];
}

export function SocialLinkForm({
  initialLink,
  onSubmit,
  onCancel,
  existingPlatforms = [],
}: SocialLinkFormProps) {
  const [platform, setPlatform] = useState<SocialPlatformId>(initialLink?.platform || 'x');
  const [label, setLabel] = useState(initialLink?.label || '');
  const [value, setValue] = useState(initialLink?.value || '');
  const [error, setError] = useState<string | null>(null);

  const platformConfig = getPlatformById(platform);
  const isCustom = platform === 'custom';
  const predefinedPlatforms = getPredefinedPlatforms();
  const availablePlatforms = predefinedPlatforms.filter(
    p => !existingPlatforms.includes(p.id) || (initialLink && p.id === initialLink.platform)
  );

  const handleSubmit = () => {
    setError(null);

    if (isCustom && !label.trim()) {
      setError('Platform name is required for custom links');
      return;
    }

    if (!value.trim()) {
      setError('Value is required');
      return;
    }

    if (platformConfig?.validation) {
      const validation = platformConfig.validation(value);
      if (!validation.valid) {
        setError(validation.error || 'Invalid format');
        return;
      }
    }

    if (isCustom) {
      try {
        new URL(value);
      } catch {
        setError('Please enter a valid URL');
        return;
      }
    }

    onSubmit({
      platform,
      label: isCustom ? label.trim() : undefined,
      value: value.trim(),
    });
  };

  const Icon = platformConfig?.icon || X;

  return (
    <div className="border dark:border-border rounded-lg p-4 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          {initialLink ? 'Edit Link' : 'Add Social Link'}
        </h4>
        <Button onClick={onCancel} variant="ghost" size="sm" className="h-6 w-6 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Platform</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {availablePlatforms.map(p => {
            const PlatformIcon = p.icon;
            const isSelected = platform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPlatform(p.id);
                  setError(null);
                }}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-300 dark:border-border hover:border-orange-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <PlatformIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{p.label}</span>
                </div>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setPlatform('custom');
              setError(null);
            }}
            className={`p-3 border rounded-lg text-left transition-colors ${
              platform === 'custom'
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-300 dark:border-border hover:border-orange-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <X className="w-4 h-4" />
              <span className="text-sm font-medium">Custom</span>
            </div>
          </button>
        </div>
      </div>

      {isCustom && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Platform Name *</label>
          <Input
            value={label}
            onChange={e => {
              setLabel(e.target.value);
              setError(null);
            }}
            placeholder="e.g., YouTube, TikTok, OnlyFans"
            required
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {isCustom ? 'URL *' : platformConfig?.label || 'Value'} *
        </label>
        <div className="relative">
          {platformConfig && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Icon className="w-4 h-4 text-gray-400 dark:text-muted-foreground" />
            </div>
          )}
          <Input
            value={value}
            onChange={e => {
              setValue(e.target.value);
              setError(null);
            }}
            placeholder={platformConfig?.placeholder || 'Enter URL or username'}
            className={platformConfig ? 'pl-10' : ''}
            required
          />
        </div>
        {platformConfig?.formatHint && (
          <p className="mt-1 text-xs text-muted-foreground">{platformConfig.formatHint}</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSubmit} className="flex-1">
          {initialLink ? 'Save Changes' : 'Add Link'}
        </Button>
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
      </div>
    </div>
  );
}
