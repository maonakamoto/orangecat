'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

function ImagePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/40">
      <div className="text-center">
        <svg
          className="mx-auto h-12 w-12 text-muted-dim"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="mt-2 text-xs font-medium text-muted-foreground">No Image</span>
      </div>
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
        <ImagePlaceholder />
      )}
    </Link>
  );
}
