'use client';

import { useState } from 'react';
import { Share2, X as XIcon, Globe, MessageCircle, Mail, Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { GRADIENTS } from '@/config/gradients';

// Brand icons removed in lucide-react 0.400+
const Facebook = Globe;
const Linkedin = Globe;

export interface SharePlatform {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  action: (url: string, title: string, description?: string) => void;
}

export const SHARE_PLATFORMS: SharePlatform[] = [
  {
    name: 'X',
    icon: XIcon,
    color: 'text-foreground',
    bgColor: 'bg-muted hover:bg-gray-100 dark:hover:bg-muted/80',
    action: (shareUrl, shareTitle, shareDescription) => {
      const text = `${shareTitle}\n\n${shareDescription}\n\n#Bitcoin #OrangeCat`;
      window.open(
        `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
        '_blank',
        'width=550,height=420'
      );
    },
  },
  {
    name: 'Facebook',
    icon: Facebook,
    color: 'text-tiffany-600',
    bgColor: 'bg-tiffany-50 hover:bg-tiffany-100',
    action: (shareUrl, shareTitle) => {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareTitle)}`,
        '_blank',
        'width=550,height=420'
      );
    },
  },
  {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'text-tiffany-700',
    bgColor: 'bg-tiffany-50 hover:bg-tiffany-100',
    action: (shareUrl, shareTitle, shareDescription) => {
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}&summary=${encodeURIComponent(shareDescription || '')}`,
        '_blank',
        'width=550,height=420'
      );
    },
  },
  {
    name: 'WhatsApp',
    icon: MessageCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
    action: (shareUrl, shareTitle) => {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}`,
        '_blank'
      );
    },
  },
  {
    name: 'Email',
    icon: Mail,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted hover:bg-gray-100 dark:hover:bg-muted/80',
    action: (shareUrl, shareTitle, shareDescription) => {
      const subject = encodeURIComponent(`Check out ${shareTitle}`);
      const body = encodeURIComponent(`${shareDescription}\n\n${shareUrl}`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    },
  },
];

export interface ShareContentProps {
  title: string;
  description: string;
  url: string;
  onClose?: () => void;
  className?: string;
  showTitle?: boolean;
  titleText?: string;
}

/**
 * Reusable ShareContent Component
 *
 * DRY, modular sharing UI that works for profiles, projects, and any shareable content.
 * Best practices:
 * - Single source of truth for share platforms
 * - Consistent UX across all sharing contexts
 * - Mobile-first with native share API support
 * - Accessible and responsive
 */
export default function ShareContent({
  title,
  description,
  url,
  onClose,
  className = '',
  showTitle = true,
  titleText = 'Share',
}: ShareContentProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  // Handle native share (mobile)
  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
        if (onClose) {
          onClose();
        }
      } catch (error) {
        // User cancelled or error occurred
        if ((error as Error).name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    }
  };

  // Handle platform-specific sharing
  const handlePlatformShare = (platform: SharePlatform) => {
    platform.action(url, title, description);
    if (onClose) {
      onClose();
    }
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      toast.success('URL copied to clipboard!');
      setTimeout(() => {
        setCopySuccess(false);
        if (onClose) {
          onClose();
        }
      }, 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  // Check if native share is available
  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  // Modern share UI - Modal on mobile, dropdown on desktop
  const shareContent = (
    <div
      className={`bg-card rounded-2xl shadow-2xl border border-gray-200/50 dark:border-border/50 backdrop-blur-xl p-5 sm:p-6 w-full max-w-md mx-auto ${className}`}
      style={{
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {showTitle && (
        <div className="flex items-center justify-between mb-5 sm:mb-6 pb-4 border-b border-border-subtle">
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-lg">
            <div
              className={`w-8 h-8 rounded-full ${GRADIENTS.brandOrange} flex items-center justify-center`}
            >
              <Share2 className="w-4 h-4 text-white" />
            </div>
            {titleText}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-muted-dim hover:text-gray-600 dark:hover:text-foreground transition-colors p-2 hover:bg-gray-100 dark:hover:bg-muted rounded-full touch-manipulation min-h-11 min-w-11 flex items-center justify-center"
              aria-label="Close share menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Native Share (Mobile) - Show as primary option if available */}
      {hasNativeShare && (
        <button
          onClick={handleNativeShare}
          className={`w-full mb-5 flex items-center justify-center gap-3 p-4 rounded-xl ${GRADIENTS.btnOrange} text-white font-semibold transition-all touch-manipulation active:scale-95 shadow-lg shadow-orange-500/30`}
        >
          <Share2 className="w-5 h-5" />
          <span>Share via...</span>
        </button>
      )}

      {/* Social Platforms - Modern grid with icons */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 sm:gap-4 mb-5">
        {SHARE_PLATFORMS.map(platform => {
          const Icon = platform.icon;
          return (
            <button
              key={platform.name}
              onClick={() => handlePlatformShare(platform)}
              className={`group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl transition-all touch-manipulation active:scale-95 ${platform.bgColor} hover:shadow-md`}
              aria-label={`Share on ${platform.name}`}
            >
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${platform.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}
              >
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${platform.color}`} />
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-muted-foreground group-hover:text-gray-900 dark:group-hover:text-foreground">
                {platform.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Copy URL - Prominent action */}
      <button
        onClick={handleCopy}
        className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl transition-all touch-manipulation active:scale-95 font-semibold ${
          copySuccess
            ? 'bg-green-50 hover:bg-green-100 text-green-700 border-2 border-green-200'
            : 'bg-muted hover:bg-gray-100 dark:hover:bg-muted/80 text-foreground border-2 border-border'
        }`}
        aria-label="Copy URL to clipboard"
      >
        {copySuccess ? (
          <>
            <Check className="w-5 h-5" />
            <span>Copied to clipboard!</span>
          </>
        ) : (
          <>
            <Copy className="w-5 h-5" />
            <span>Copy Link</span>
          </>
        )}
      </button>
    </div>
  );

  // On mobile, show as modal overlay; on desktop, show as dropdown
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  if (isMobile && onClose) {
    // Mobile: Dialog modal
    return (
      <Dialog open onOpenChange={open => !open && onClose()}>
        <DialogContent className="max-w-md">
          <DialogTitle className="sr-only">Share</DialogTitle>
          {shareContent}
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop: Dropdown
  return shareContent;
}
