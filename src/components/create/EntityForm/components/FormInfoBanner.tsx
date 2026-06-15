/**
 * FORM INFO BANNER
 * Displays informational banners with different variants
 */

interface InfoBanner {
  title: string;
  content: string;
  variant?: 'info' | 'warning' | 'success';
}

interface FormInfoBannerProps {
  banner: InfoBanner;
}

export function FormInfoBanner({ banner }: FormInfoBannerProps) {
  const variantStyles = {
    warning: {
      bg: 'border-status-warning/20 bg-status-warning/10',
      title: 'text-status-warning',
      content: 'text-fg-secondary',
    },
    success: {
      bg: 'border-status-positive/20 bg-status-positive/10',
      title: 'text-status-positive',
      content: 'text-fg-secondary',
    },
    info: {
      bg: 'border-subtle bg-surface-raised/30',
      title: 'text-fg-primary',
      content: 'text-fg-secondary',
    },
  };

  const styles = variantStyles[banner.variant || 'info'];

  return (
    <div className={`rounded-md border p-4 ${styles.bg}`}>
      <h4 className={`text-sm font-semibold mb-2 ${styles.title}`}>{banner.title}</h4>
      <p className={`text-sm ${styles.content}`}>{banner.content}</p>
    </div>
  );
}
