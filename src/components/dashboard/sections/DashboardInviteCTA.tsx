'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import ProfileShare from '@/components/sharing/ProfileShare';
import { Users, Share2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { ROUTES } from '@/config/routes';
import { GRADIENTS } from '@/config/gradients';

interface DashboardInviteCTAProps {
  profile: {
    username?: string | null;
    name?: string | null;
    bio?: string | null;
  } | null;
  userId: string;
}

/**
 * DashboardInviteCTA - Invite friends and share profile section
 */
export function DashboardInviteCTA({ profile, userId }: DashboardInviteCTAProps) {
  const [showShare, setShowShare] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/profiles/${profile?.username || userId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success('Invite link copied'))
      .catch(() => toast.error('Failed to copy link'));
  };

  return (
    <div
      className={`relative rounded-xl border border-orange-200 ${GRADIENTS.sectionOrangeTiffany} p-4 sm:p-5 shadow-sm`}
    >
      <div className="space-y-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            Invite friends to OrangeCat
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Share your profile link and start building your network
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={ROUTES.DASHBOARD.PEOPLE}>
            <Button variant="outline" size="sm" className="min-h-11">
              <Users className="w-4 h-4 mr-2" />
              Discover
            </Button>
          </Link>
          <Button
            onClick={() => setShowShare(!showShare)}
            size="sm"
            className="bg-tiffany-500 hover:bg-tiffany-600 text-white min-h-11"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="min-h-11">
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
        </div>
      </div>
      {showShare && (
        <div className="absolute right-4 top-full mt-2 z-50">
          <ProfileShare
            username={profile?.username || userId}
            profileName={profile?.name || profile?.username || 'My Profile'}
            profileBio={profile?.bio || undefined}
            onClose={() => setShowShare(false)}
          />
        </div>
      )}
    </div>
  );
}

export default DashboardInviteCTA;
