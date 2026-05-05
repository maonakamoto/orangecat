import type { SocialPlatformId } from '@/lib/social-platforms';

export interface SocialLink {
  platform: SocialPlatformId;
  label?: string; // For custom platforms
  value: string; // URL or username
}
