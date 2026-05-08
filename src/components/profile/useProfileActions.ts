'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { API_ROUTES } from '@/config/api-routes';
import { useAuth } from '@/hooks/useAuth';
import type { ScalableProfile, ProfileFormData } from '@/types/database';

interface UseProfileActionsParams {
  profile: ScalableProfile;
  isOwnProfile: boolean;
  onSave?: (data: ProfileFormData) => Promise<void>;
}

export function useProfileActions({ profile, isOwnProfile, onSave }: UseProfileActionsParams) {
  const { user } = useAuth();
  const router = useRouter();
  const [showShare, setShowShare] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const shareButtonRef = useRef<HTMLDivElement>(null);
  const shareDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id || isOwnProfile || !profile.id) {
      return;
    }
    const checkFollowStatus = async () => {
      try {
        const response = await fetch(API_ROUTES.SOCIAL.FOLLOWING(user.id));
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setIsFollowing(
            data.data.some((f: { following_id: string }) => f.following_id === profile.id)
          );
        }
      } catch (error) {
        logger.error('Failed to check follow status:', error);
      }
    };
    checkFollowStatus();
  }, [user?.id, profile.id, isOwnProfile]);

  useEffect(() => {
    if (!showShare) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (
        shareDropdownRef.current &&
        !shareDropdownRef.current.contains(event.target as Node) &&
        shareButtonRef.current &&
        !shareButtonRef.current.contains(event.target as Node)
      ) {
        setShowShare(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showShare]);

  const handleFollowToggle = async () => {
    if (!user?.id || !profile.id || isFollowLoading) {
      return;
    }
    setIsFollowLoading(true);
    try {
      const endpoint = isFollowing ? API_ROUTES.SOCIAL.UNFOLLOW : API_ROUTES.SOCIAL.FOLLOW;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: profile.id }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setIsFollowing(prev => !prev);
        toast.success(isFollowing ? 'Unfollowed' : 'Followed');
      } else {
        throw new Error(data.error || 'Failed to update follow status');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update follow status');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleProfileSave = async (data: ProfileFormData) => {
    try {
      const response = await fetch(API_ROUTES.PROFILE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save profile');
      }
      toast.success('Profile updated successfully');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save profile');
      throw error;
    }
  };

  return {
    showShare,
    setShowShare,
    isFollowing,
    isFollowLoading,
    shareButtonRef,
    shareDropdownRef,
    handleFollowToggle,
    resolvedHandleProfileSave: onSave ?? handleProfileSave,
  };
}
