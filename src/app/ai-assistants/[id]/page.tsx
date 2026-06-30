import { Metadata } from 'next';
import Image from 'next/image';
import { generateEntityMetadata } from '@/lib/seo/metadata';
import PublicEntityDetailPage, {
  fetchEntityForMetadata,
  type EntityDetailConfig,
} from '@/components/public/PublicEntityDetailPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import PriceDisplay from '@/components/public/PriceDisplay';
import AiAssistantChat from '@/components/ai-assistants/AiAssistantChat';
import { ROUTES } from '@/config/routes';

interface PageProps {
  params: Promise<{ id: string }>;
}

// ai_assistants price by pricing_model, stored in BTC (no currency column;
// the sats→BTC migration dropped the _sats suffix and converted values).
const AI_PRICE_BY_MODEL: Record<string, { column: string; suffix: string }> = {
  per_message: { column: 'price_per_message', suffix: ' / message' },
  per_token: { column: 'price_per_1k_tokens', suffix: ' / 1k tokens' },
  subscription: { column: 'subscription_price', suffix: ' / month' },
};

const getAiPricing = (entity: Record<string, unknown>) => {
  const model = (entity.pricing_model as string) || 'free';
  if (model === 'free') {
    return { isFree: true, amount: 0, suffix: '' };
  }
  const spec = AI_PRICE_BY_MODEL[model];
  const amount = spec ? Number(entity[spec.column] ?? 0) : 0;
  return { isFree: false, amount, suffix: spec?.suffix ?? '' };
};

const config: EntityDetailConfig = {
  entityType: 'ai_assistant',
  ownerLabel: 'Created by',
  descriptionTitle: 'About this AI Assistant',
  metadataSelect: 'title, description, avatar_url',
  // No pay-the-seller-direct section: you don't pay an assistant up front — you
  // chat, and it charges per its pricing model (free / per-message via Cat
  // Credits) inside the chat widget. This also suppresses the default mobile
  // sticky CTA, which would otherwise anchor "Chat" to a #pay section that
  // shouldn't exist here. The chat widget is the primary action.
  showPaymentSection: false,
  getViewRoute: id => ROUTES.AI_ASSISTANTS.VIEW(id),
  renderHeaderIcon: entity =>
    entity.avatar_url ? (
      <Image
        src={entity.avatar_url as string}
        alt={(entity.title as string) || 'AI assistant'}
        width={64}
        height={64}
        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        unoptimized
      />
    ) : undefined,
  renderHeaderExtra: entity => {
    if (!entity.category) {
      return null;
    }
    return (
      <Badge variant="outline" className="capitalize">
        {entity.category}
      </Badge>
    );
  },
  renderDetails: entity => {
    const tags: string[] = Array.isArray(entity.tags) ? entity.tags : [];
    const traits: string[] = Array.isArray(entity.personality_traits)
      ? entity.personality_traits
      : [];
    const welcome = entity.welcome_message as string | null | undefined;
    const pricing = getAiPricing(entity);

    return (
      <>
        <AiAssistantChat
          assistantId={entity.id as string}
          assistantName={(entity.title as string) || 'this assistant'}
          assistantAvatar={entity.avatar_url as string | null | undefined}
          welcomeMessage={welcome}
          pricing={pricing}
        />

        {(pricing.isFree || pricing.amount > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              {pricing.isFree ? (
                <p className="text-2xl font-bold text-fg-primary">Free</p>
              ) : (
                <PriceDisplay amount={pricing.amount} currency="BTC" suffix={pricing.suffix} />
              )}
            </CardContent>
          </Card>
        )}

        {welcome && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Welcome Message</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-fg-primary italic whitespace-pre-wrap">{welcome}</p>
            </CardContent>
          </Card>
        )}

        {(tags.length > 0 || traits.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tags.length > 0 && (
                <div>
                  <p className="text-sm text-fg-secondary mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {traits.length > 0 && (
                <div>
                  <p className="text-sm text-fg-secondary mb-2">Personality</p>
                  <div className="flex flex-wrap gap-2">
                    {traits.map(trait => (
                      <Badge key={trait} variant="outline">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </>
    );
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const entity = await fetchEntityForMetadata('ai_assistant', id, 'title, description, avatar_url');
  if (!entity) {
    return { title: 'AI Assistant Not Found' };
  }
  return generateEntityMetadata({
    type: 'ai_assistant',
    id,
    title: entity.title,
    description: entity.description,
    imageUrl: entity.avatar_url,
  });
}

export default async function PublicAIAssistantPage({ params }: PageProps) {
  const { id } = await params;
  return <PublicEntityDetailPage id={id} config={config} />;
}
