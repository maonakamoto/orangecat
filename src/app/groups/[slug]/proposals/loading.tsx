import { PageHeaderSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <PageHeaderSkeleton />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  );
}
