'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useUserCurrency } from '@/hooks/useUserCurrency';
import { logger } from '@/utils/logger';

export function useProjectDonation(projectId: string) {
  const { user } = useAuth();
  const userCurrency = useUserCurrency();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  useEffect(() => {
    if (!projectId || !user) {
      setIsFavorited(false);
      return;
    }

    const checkFavoriteStatus = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/favorite`);
        if (response.ok) {
          const result = await response.json();
          setIsFavorited(result.data?.isFavorited || false);
        }
      } catch (error) {
        logger.error(
          'Failed to check favorite status',
          { projectId, error },
          'ProjectDonationSection'
        );
      }
    };

    checkFavoriteStatus();
  }, [projectId, user]);

  const handleToggleFavorite = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to favorite projects');
      return;
    }

    const previousState = isFavorited;
    setIsFavorited(!isFavorited);
    setIsTogglingFavorite(true);

    try {
      const method = previousState ? 'DELETE' : 'POST';
      const response = await fetch(`/api/projects/${projectId}/favorite`, { method });

      if (!response.ok) {
        throw new Error('Failed to toggle favorite');
      }

      const result = await response.json();
      setIsFavorited(result.data?.isFavorited ?? !previousState);
      toast.success(result.data?.isFavorited ? 'Added to favorites' : 'Removed from favorites');
    } catch (error) {
      setIsFavorited(previousState);
      logger.error('Failed to toggle favorite', { projectId, error }, 'ProjectDonationSection');
      toast.error('Failed to update favorite. Please try again.');
    } finally {
      setIsTogglingFavorite(false);
    }
  }, [projectId, user, isFavorited]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return {
    user,
    userCurrency,
    isFavorited,
    isTogglingFavorite,
    handleToggleFavorite,
    copyToClipboard,
  };
}
