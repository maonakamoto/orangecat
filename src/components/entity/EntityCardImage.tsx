'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// Pull the first grapheme of the title, uppercased. Skips leading whitespace
// and emoji-style symbols (which read as mojibake at large sizes) so a title
// like "  ✨ Open Source Privacy Tools" still surfaces as "O", not "✨".
function titleInitial(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    return '·';
  }
  const firstLetter = trimmed.match(/[\p{Letter}\p{Number}]/u);
  return (firstLetter?.[0] ?? trimmed[0] ?? '·').toUpperCase();
}

function ImagePlaceholder({ title }: { title: string }) {
  const initial = titleInitial(title);
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-muted/40"
      role="img"
      aria-label={`${title} — no cover image`}
    >
      <span
        className="select-none text-5xl font-semibold tracking-tight text-muted-foreground/60"
        aria-hidden="true"
      >
        {initial}
      </span>
    </div>
  );
}

function ImageLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-tiffany-600" />
    </div>
  );
}

interface EntityCardImageProps {
  imageSrc: string | undefined | null;
  title: string;
  compact: boolean;
  href: string;
}

export function EntityCardImage({ imageSrc, title, compact, href }: EntityCardImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const showImage = imageSrc && !imageError;

  return (
    <Link
      href={href}
      className={cn(
        'relative w-full overflow-hidden bg-muted block',
        compact ? 'aspect-[4/3]' : 'aspect-video'
      )}
    >
      {showImage ? (
        <>
          <Image
            src={imageSrc!}
            alt={title}
            fill
            className={cn(
              'object-cover transition-all duration-300',
              imageLoaded && 'group-hover:scale-105',
              !imageLoaded && 'opacity-0'
            )}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={imageSrc!.startsWith('data:') || imageSrc!.startsWith('blob:')}
            onError={() => setImageError(true)}
            onLoad={() => setImageLoaded(true)}
          />
          {!imageLoaded && <ImageLoader />}
        </>
      ) : (
        <ImagePlaceholder title={title} />
      )}
    </Link>
  );
}
