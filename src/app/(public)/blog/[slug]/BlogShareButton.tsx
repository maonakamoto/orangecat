'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import ShareContent from '@/components/sharing/ShareContent';

interface BlogShareButtonProps {
  title: string;
  description: string;
  url: string;
}

export default function BlogShareButton({ title, description, url }: BlogShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-default hover:bg-surface-raised text-sm font-medium text-fg-primary transition-colors"
        aria-label="Share article"
      >
        <Share2 className="w-4 h-4" />
        Share Article
      </button>
    );
  }

  return (
    <div className="relative">
      <ShareContent
        title={title}
        description={description}
        url={url}
        onClose={() => setIsOpen(false)}
        titleText="Share Article"
      />
    </div>
  );
}
