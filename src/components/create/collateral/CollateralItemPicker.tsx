'use client';

interface PickerItem {
  id: string;
  label: string;
  sublabel?: string;
}

interface CollateralItemPickerProps {
  title: string;
  loading: boolean;
  items: PickerItem[];
  emptyMessage: string;
  emptyLinkHref: string;
  emptyLinkText: string;
  onSelect: (item: PickerItem) => void;
}

export function CollateralItemPicker({
  title,
  loading,
  items,
  emptyMessage,
  emptyLinkHref,
  emptyLinkText,
  onSelect,
}: CollateralItemPickerProps) {
  return (
    <div className="border border-gray-200 dark:border-border rounded-lg p-4 bg-white dark:bg-card">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-foreground mb-3">{title}</h4>
      {loading ? (
        <p className="text-base text-gray-500 dark:text-muted-foreground">Loading...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-base text-gray-500 mb-2">{emptyMessage}</p>
          <a
            href={emptyLinkHref}
            className="text-sm text-tiffany-600 hover:text-tiffany-700 font-medium"
          >
            {emptyLinkText}
          </a>
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-muted rounded border border-gray-200 dark:border-border"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-foreground">
                  {item.label}
                </span>
                {item.sublabel && (
                  <span className="text-xs text-gray-500 dark:text-muted-foreground">
                    {item.sublabel}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
