import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { timelineService } from '@/services/timeline';
import { logger } from '@/utils/logger';

export const useTimelineEvents = () => {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const handleProjectCreated = async (event: CustomEvent) => {
      const { projectId, projectData } = event.detail;
      try {
        await timelineService.createProjectEvent(projectId, 'project_created', user.id, {
          metadata: {
            project_title: projectData.title,
            project_description: projectData.description,
            project_category: projectData.category,
            project_goal: projectData.goal_amount,
            project_currency: projectData.currency,
          },
        });
        logger.info('Created timeline event for project creation', { projectId }, 'TimelineHook');
      } catch (error) {
        logger.error('Failed to create project creation timeline event', error, 'TimelineHook');
      }
    };

    const handleSupportReceived = async (event: CustomEvent) => {
      const { transactionId, projectId, amountBtc, supporterId } = event.detail;
      try {
        await timelineService.createTransactionEvent(
          transactionId,
          projectId,
          supporterId || user.id,
          amountBtc
        );
        logger.info(
          'Created timeline event for support',
          { transactionId, projectId },
          'TimelineHook'
        );
      } catch (error) {
        logger.error('Failed to create support timeline event', error, 'TimelineHook');
      }
    };

    const handleProfileUpdated = async (event: CustomEvent) => {
      const { changes } = event.detail;
      try {
        const significantFields = [
          'display_name',
          'username',
          'bio',
          'bitcoin_address',
          'lightning_address',
          'avatar_url',
        ];
        const hasSignificantChange = significantFields.some(
          field => changes && changes[field] !== undefined
        );
        if (hasSignificantChange) {
          await timelineService.createEvent({
            eventType: 'profile_updated',
            actorId: user.id,
            subjectType: 'profile',
            subjectId: user.id,
            title: 'Updated profile information',
            description: `${profile?.name || profile?.username || 'User'} updated their profile`,
            visibility: 'followers',
            metadata: { changes },
          });
          logger.info(
            'Created timeline event for profile update',
            { userId: user.id },
            'TimelineHook'
          );
        }
      } catch (error) {
        logger.error('Failed to create profile update timeline event', error, 'TimelineHook');
      }
    };

    const handleUserFollowed = async (event: CustomEvent) => {
      const { followedUserId, followedUserData } = event.detail;
      try {
        await timelineService.createEvent({
          eventType: 'user_followed',
          actorId: user.id,
          subjectType: 'profile',
          subjectId: followedUserId,
          targetType: 'profile',
          targetId: followedUserId,
          title: `Started following ${followedUserData?.display_name || followedUserData?.username || 'someone'}`,
          description: `${profile?.name || profile?.username || 'User'} started following ${followedUserData?.display_name || followedUserData?.username || 'someone'}`,
          visibility: 'followers',
        });
        logger.info('Created timeline event for user follow', { followedUserId }, 'TimelineHook');
      } catch (error) {
        logger.error('Failed to create follow timeline event', error, 'TimelineHook');
      }
    };

    window.addEventListener('project-created', handleProjectCreated as unknown as EventListener);
    window.addEventListener('support-received', handleSupportReceived as unknown as EventListener);
    window.addEventListener('profile-updated', handleProfileUpdated as unknown as EventListener);
    window.addEventListener('user-followed', handleUserFollowed as unknown as EventListener);

    return () => {
      window.removeEventListener(
        'project-created',
        handleProjectCreated as unknown as EventListener
      );
      window.removeEventListener(
        'support-received',
        handleSupportReceived as unknown as EventListener
      );
      window.removeEventListener(
        'profile-updated',
        handleProfileUpdated as unknown as EventListener
      );
      window.removeEventListener('user-followed', handleUserFollowed as unknown as EventListener);
    };
  }, [user?.id, profile]);

  return {
    dispatchProjectCreated: (projectId: string, projectData: Record<string, unknown>) => {
      window.dispatchEvent(
        new CustomEvent('project-created', { detail: { projectId, projectData } })
      );
    },

    dispatchSupportReceived: (
      transactionId: string,
      projectId: string,
      amountBtc: number,
      supporterId?: string
    ) => {
      window.dispatchEvent(
        new CustomEvent('support-received', {
          detail: { transactionId, projectId, amountBtc, supporterId },
        })
      );
    },

    dispatchProfileUpdated: (changes: Record<string, unknown>) => {
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { changes } }));
    },

    dispatchUserFollowed: (
      followedUserId: string,
      followedUserData?: { display_name?: string; username?: string }
    ) => {
      window.dispatchEvent(
        new CustomEvent('user-followed', { detail: { followedUserId, followedUserData } })
      );
    },
  };
};
