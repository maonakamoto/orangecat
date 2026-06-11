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
      content: 'text-muted-foreground',
    },
    success: {
      bg: 'border-status-positive/20 bg-status-positive/10',
      title: 'text-status-positive',
      content: 'text-muted-foreground',
    },
    info: {
      bg: 'border-border-subtle bg-muted/30',
      title: 'text-foreground',
      content: 'text-muted-foreground',
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
