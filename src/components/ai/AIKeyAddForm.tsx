'use client';

import { useState } from 'react';
import { Key, AlertCircle, ExternalLink, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { aiProviders, getAIProvider, validateApiKeyFormat } from '@/data/aiProviders';

/**
 * Providers Cat's chat route can actually route through today.
 *
 * Direct: Groq + the OpenAI-compatible direct providers (OpenAI, Together,
 * DeepSeek, xAI). Aggregator: OpenRouter. Local providers (Ollama,
 * LM Studio) aren't here yet — they need a different architecture
 * because the Vercel backend can't reach the user's localhost.
 *
 * Anthropic and Google are intentionally NOT here — they use different
 * wire formats (not OpenAI-compatible) and need their own client classes.
 * Users who want Claude or Gemini should add an OpenRouter key.
 */
const WIRED_PROVIDER_IDS = new Set(['groq', 'openrouter', 'openai', 'together', 'deepseek', 'xai']);
const wiredProviders = aiProviders.filter(p => WIRED_PROVIDER_IDS.has(p.id));

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
    <Card className="border-border-subtle bg-muted/40/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Add API Key</CardTitle>
        <CardDescription>Add your API key from your chosen provider</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Provider</label>
          <div
            className="grid grid-cols-2 gap-2"
            onFocus={() => onFieldFocus?.('provider')}
            onBlur={() => onFieldFocus?.(null)}
          >
            {wiredProviders.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProvider(p.id)}
                className={cn(
                  'p-3 rounded-lg border-2 text-left transition-all',
                  selectedProvider === p.id
                    ? 'border-foreground bg-muted/40'
                    : 'border-border hover:border-border-strong dark:hover:border-border'
                )}
              >
                <div className="font-medium text-sm">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.type}</div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Want Claude or Gemini? Add an <strong className="text-foreground">OpenRouter</strong>{' '}
            key — one key fronts all 200+ models. Direct Anthropic + Google support is on the
            roadmap.
          </p>
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
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
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
                className="text-foreground hover:underline inline-flex items-center gap-1"
              >
                {provider.name}
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          )}
        </div>

        {error && (
          <div className="oc-error-surface flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive/80">{error}</p>
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
