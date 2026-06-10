'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Key,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { aiProviders, getAIProvider, validateApiKeyFormat } from '@/data/aiProviders';
import { ROUTES } from '@/config/routes';

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

type FormState = 'idle' | 'submitting' | 'success';

export function AIKeyAddForm({ onAdd, onCancel, onFieldFocus }: AIKeyAddFormProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [keyName, setKeyName] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [formState, setFormState] = useState<FormState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [successProviderId, setSuccessProviderId] = useState<string | null>(null);

  const provider = getAIProvider(selectedProvider);
  const successProvider = successProviderId ? getAIProvider(successProviderId) : null;

  const resetForm = (keepProvider = true) => {
    setApiKey('');
    setKeyName('');
    setError(null);
    setShowKey(false);
    setFormState('idle');
    setSuccessProviderId(null);
    if (!keepProvider) {
      setSelectedProvider('openrouter');
    }
  };

  const handleSubmit = async () => {
    if (!apiKey || !provider) {
      return;
    }

    const validation = validateApiKeyFormat(selectedProvider, apiKey);
    if (!validation.valid) {
      setError(validation.message || 'Invalid API key format');
      return;
    }

    setFormState('submitting');
    setError(null);

    try {
      await onAdd({
        provider: selectedProvider,
        apiKey,
        keyName: keyName || `${provider.name} Key`,
      });
      setSuccessProviderId(selectedProvider);
      setApiKey('');
      setKeyName('');
      setFormState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add key');
      setFormState('idle');
    }
  };

  if (formState === 'success' && successProvider) {
    return (
      <Card className="border-status-positive/30 bg-status-positive-subtle">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-background p-2">
              <CheckCircle className="h-6 w-6 text-status-positive" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">
                Connected to {successProvider.name}
              </h3>
              <p className="mt-1 text-sm text-muted-strong">
                Cat is now routing every message through your {successProvider.name} key. You pay{' '}
                {successProvider.name} directly — OrangeCat never sees your bill, never marks it up.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                <Sparkles className="mr-1 inline h-3 w-3" aria-hidden="true" />
                The freedom architecture: your provider, your bill, your choice. Always.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" size="sm" onClick={() => resetForm()}>
              Add another key
            </Button>
            <Link href={ROUTES.DASHBOARD.CAT}>
              <Button variant="accent" size="sm">
                <Sparkles className="mr-2 h-4 w-4" />
                Start chatting
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isSubmitting = formState === 'submitting';

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
                Validating…
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
