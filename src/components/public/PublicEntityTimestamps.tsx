import { Calendar, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { formatRelativeTime, formatDate } from '@/utils/dates';

interface PublicEntityTimestampsProps {
  createdAt: string;
  updatedAt?: string | null;
  createdLabel?: string;
}

export default function PublicEntityTimestamps({
  createdAt,
  updatedAt,
  createdLabel = 'Created',
}: PublicEntityTimestampsProps) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-3 text-sm">
        <div className="flex items-center gap-2 text-fg-secondary">
          <Calendar className="w-4 h-4" />
          <span>
            {createdLabel} {formatDate(createdAt)}
          </span>
        </div>
        {updatedAt && updatedAt !== createdAt && (
          <div className="flex items-center gap-2 text-fg-secondary">
            <Clock className="w-4 h-4" />
            <span>Updated {formatRelativeTime(updatedAt)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
