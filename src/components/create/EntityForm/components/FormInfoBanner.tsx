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
      bg: 'border-yellow-500/20 bg-yellow-500/10',
      title: 'text-yellow-700 dark:text-yellow-300',
      content: 'text-muted-foreground',
    },
    success: {
      bg: 'border-green-500/20 bg-green-500/10',
      title: 'text-green-700 dark:text-green-300',
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
