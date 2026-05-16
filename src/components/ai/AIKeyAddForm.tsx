'use client';

import { useState } from 'react';
import { Key, AlertCircle, ExternalLink, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { aiProviders, getAIProvider, validateApiKeyFormat } from '@/data/aiProviders';

interface AIKeyAddFormProps {
  onAdd: (data: { provider: string; apiKey: string; keyName: string }) => Promise<void>;
  onCancel: () => void;
  onFieldFocus?: (field: string | null) => void;
}

export function AIKeyAddForm({ onAdd, onCancel, onFieldFocus }: AIKeyAddFormProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [keyName, setKeyName] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provider = getAIProvider(selectedProvider);

  const handleSubmit = async () => {
    if (!apiKey || !provider) {
      return;
    }

    const validation = validateApiKeyFormat(selectedProvider, apiKey);
    if (!validation.valid) {
      setError(validation.message || 'Invalid API key format');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onAdd({
        provider: selectedProvider,
        apiKey,
        keyName: keyName || `${provider.name} Key`,
      });
      setApiKey('');
      setKeyName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add key');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-tiffany-200 bg-tiffany-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Add API Key</CardTitle>
        <CardDescription>Add your API key from your chosen provider</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Provider</label>
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-2"
            onFocus={() => onFieldFocus?.('provider')}
            onBlur={() => onFieldFocus?.(null)}
          >
            {aiProviders.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProvider(p.id)}
                className={cn(
                  'p-3 rounded-lg border-2 text-left transition-all',
                  selectedProvider === p.id
                    ? 'border-tiffany-500 bg-tiffany-50'
                    : 'border-border hover:border-gray-300 dark:hover:border-border'
                )}
              >
                <div className="font-medium text-sm">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.type}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Key Name (optional)
          </label>
          <Input
            value={keyName}
            onChange={e => setKeyName(e.target.value)}
            placeholder={`e.g., ${provider?.name || 'My'} Key for OrangeCat`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">API Key</label>
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => {
                setApiKey(e.target.value);
                setError(null);
              }}
              onFocus={() => onFieldFocus?.('apiKey')}
              onBlur={() => onFieldFocus?.(null)}
              placeholder={provider?.apiKeyExample || 'sk-...'}
              className="pr-20"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-gray-700 dark:hover:text-foreground"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {provider && (
            <p className="mt-1 text-xs text-muted-foreground">
              Get your key at{' '}
              <a
                href={provider.apiKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-tiffany-600 hover:underline inline-flex items-center gap-1"
              >
                {provider.name}
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!apiKey || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Add Key
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
