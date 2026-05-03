import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { buildLocationContext, type LocationMode } from '@/lib/location-privacy';
import { normalizeProfileData } from '@/lib/validation';
import { SocialLink } from '@/types/social';
import { ProfileFormData } from '@/types/database';
import type * as z from 'zod';
import type { profileSchema as serverProfileSchema } from '@/lib/validation';

type ProfileFormValues = z.infer<typeof serverProfileSchema>;

interface SubmitProfileOptions {
  data: ProfileFormValues;
  socialLinks: SocialLink[];
  locationMode: LocationMode;
  locationGroupLabel: string;
  setIsSaving: (v: boolean) => void;
  onSave: (data: ProfileFormData) => Promise<void>;
}

export async function submitProfileForm({
  data,
  socialLinks,
  locationMode,
  locationGroupLabel,
  setIsSaving,
  onSave,
}: SubmitProfileOptions) {
  setIsSaving(true);
  try {
    const adjusted: ProfileFormValues = {
      ...data,
      latitude: data.latitude === ('' as unknown as number) ? undefined : data.latitude,
      longitude: data.longitude === ('' as unknown as number) ? undefined : data.longitude,
    };
    if (locationMode === 'hidden') {
      adjusted.location_context = buildLocationContext(adjusted.location_context, 'hidden');
    } else if (locationMode === 'group') {
      const group = locationGroupLabel?.trim() || '';
      adjusted.location_search = group;
      adjusted.location_country = null;
      adjusted.location_city = null;
      adjusted.location_zip = null;
      adjusted.latitude = undefined;
      adjusted.longitude = undefined;
      adjusted.location_context = buildLocationContext(adjusted.location_context, 'group', group);
    } else {
      adjusted.location_context = buildLocationContext(adjusted.location_context, 'actual');
    }

    const normalizedLinks =
      socialLinks.length > 0
        ? {
            links: socialLinks.map(link => ({
              platform: link.platform,
              value: link.value,
              label: link.label || undefined,
            })),
          }
        : undefined;

    const normalizedData = normalizeProfileData({ ...adjusted, social_links: normalizedLinks });
    await onSave(normalizedData as ProfileFormData);
  } catch (error) {
    let errorMessage = 'Please try again';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      errorMessage =
        (typeof errorObj.message === 'string' ? errorObj.message : null) ||
        (typeof errorObj.error === 'string' ? errorObj.error : null) ||
        JSON.stringify(error);
    }
    toast.error('Failed to save profile', { description: errorMessage });
    logger.error('Profile save error:', error);
  } finally {
    setIsSaving(false);
  }
}
