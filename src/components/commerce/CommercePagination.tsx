'use client';

interface Props {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function CommercePagination({ page, limit, total, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        disabled={prevDisabled}
        onClick={() => onPageChange(page - 1)}
        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card dark:text-foreground disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-sm text-gray-600 dark:text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <button
        disabled={nextDisabled}
        onClick={() => onPageChange(page + 1)}
        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card dark:text-foreground disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
