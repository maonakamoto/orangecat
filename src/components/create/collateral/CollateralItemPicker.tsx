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
    <div className="border border-default rounded-lg p-4 bg-surface-base">
      <h4 className="text-sm font-semibold text-fg-primary mb-3">{title}</h4>
      {loading ? (
        <p className="text-base text-fg-secondary">Loading...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-base text-fg-secondary mb-2">{emptyMessage}</p>
          <a
            href={emptyLinkHref}
            className="text-sm text-fg-primary hover:underline underline-offset-4 font-medium"
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
              className="w-full text-left p-2 hover:bg-surface-raised rounded border border-default"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-fg-primary">{item.label}</span>
                {item.sublabel && (
                  <span className="text-xs text-fg-secondary">{item.sublabel}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
