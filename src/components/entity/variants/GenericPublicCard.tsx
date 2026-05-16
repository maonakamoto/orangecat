'use client';

import Link from 'next/link';
import { formatRelativeTime } from '@/utils/dates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { ENTITY_REGISTRY, type EntityType } from '@/config/entity-registry';

export interface GenericPublicEntity {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  category?: string | null;
  cause_category?: string | null;
  created_at: string;
  // group uses slug for URL
  slug?: string | null;
}

interface GenericPublicCardProps {
  entity: GenericPublicEntity;
  entityType: EntityType;
  href: string;
  viewMode?: 'grid' | 'list';
}

export function GenericPublicCard({
  entity,
  entityType,
  href,
  viewMode = 'grid',
}: GenericPublicCardProps) {
  const meta = ENTITY_REGISTRY[entityType];
  const Icon = meta?.icon;
  const category = entity.category ?? entity.cause_category;

  if (viewMode === 'list') {
    return (
      <Link href={href}>
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center p-4 gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              {Icon && <Icon className="w-6 h-6 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{entity.title}</h3>
              {entity.description && (
                <p className="text-sm text-muted-foreground truncate">{entity.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              {entity.status && (
                <Badge variant="secondary" className="capitalize text-xs">
                  {entity.status}
                </Badge>
              )}
              <span className="text-gray-400 dark:text-muted-foreground whitespace-nowrap">
                {formatRelativeTime(entity.created_at)}
              </span>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">{entity.title}</CardTitle>
                <CardDescription className="text-xs">
                  {formatRelativeTime(entity.created_at)}
                </CardDescription>
              </div>
            </div>
            {entity.status && (
              <Badge variant="secondary" className="capitalize text-xs flex-shrink-0">
                {entity.status}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {entity.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">{entity.description}</p>
          )}
          {category && (
            <Badge variant="outline" className="text-xs capitalize">
              {category.replace(/_/g, ' ')}
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default GenericPublicCard;
