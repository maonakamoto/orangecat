'use client';

import { Share2 } from 'lucide-react';
import { CardContent } from '@/components/ui/Card';
import ShareContent from './ShareContent';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { APP_NAME, SITE_URL } from '@/config/brand';

interface ProjectShareProps {
  projectId: string;
  projectTitle: string;
  projectDescription?: string;
  projectImage?: string;
  currentUrl?: string;
  onClose?: () => void;
  variant?: 'modal' | 'dropdown' | 'inline';
  className?: string;
}

/**
 * ProjectShare Component
 *
 * Wrapper around ShareContent for project-specific sharing.
 * Extends ShareContent with project-specific features (QR code, analytics).
 * DRY: Uses reusable ShareContent component.
 */
export default function ProjectShare({
  projectId,
  projectTitle,
  projectDescription = '',
  currentUrl,
  onClose,
  variant = 'dropdown',
  className = '',
}: ProjectShareProps) {
  // Construct the project URL
  const projectUrl =
    currentUrl ||
    `${typeof window !== 'undefined' ? window.location.origin : SITE_URL}/projects/${projectId}`;

  // Create optimized share text
  const shareTitle = `Support: ${projectTitle}`;
  const shareDescription =
    projectDescription || `Check out this community-funded project on ${APP_NAME}: ${projectTitle}`;

  // Enhanced onClose that tracks analytics
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  if (variant === 'modal') {
    return (
      <Dialog open onOpenChange={open => !open && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Project
          </DialogTitle>
          <CardContent className="space-y-4 p-0">
            <div>
              <h4 className="font-medium text-foreground mb-1">{projectTitle}</h4>
              <p className="text-sm text-muted-foreground line-clamp-2">{projectDescription}</p>
            </div>
            <ShareContent
              title={shareTitle}
              description={shareDescription}
              url={projectUrl}
              onClose={handleClose}
              showTitle={false}
            />
          </CardContent>
        </DialogContent>
      </Dialog>
    );
  }

  // Default dropdown variant - Use ShareContent with project-specific enhancements
  return (
    <div className={className}>
      <ShareContent
        title={shareTitle}
        description={shareDescription}
        url={projectUrl}
        onClose={handleClose}
        titleText="Share Project"
      />
    </div>
  );
}
