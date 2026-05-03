import type { Profile } from '@/types/database';

interface SaveStepDataParams {
  currentStep: number;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  locationCity: string;
  website: string;
  setSaving: (v: boolean) => void;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error?: string | null }>;
}

export async function executeSaveStepData({
  currentStep,
  username,
  displayName,
  avatarUrl,
  bio,
  locationCity,
  website,
  setSaving,
  setErrors,
  updateProfile,
}: SaveStepDataParams): Promise<boolean> {
  setSaving(true);
  setErrors({});

  try {
    const data: Partial<Profile> = {};

    if (currentStep === 0) {
      data.username = username.trim();
      data.name = displayName.trim();
      if (avatarUrl) {
        data.avatar_url = avatarUrl;
      }
    } else if (currentStep === 1) {
      data.username = username.trim();
      data.name = displayName.trim();
      if (bio.trim()) {
        data.bio = bio.trim();
      }
      if (locationCity.trim()) {
        data.location_city = locationCity.trim();
      }
      if (website.trim()) {
        data.website = website.trim();
      }
    }

    if (Object.keys(data).length > 0) {
      const result = await updateProfile(data);
      if (result.error) {
        if (result.error.toLowerCase().includes('username')) {
          setErrors({ username: 'That username is already taken. Try another one.' });
        } else {
          setErrors({ general: result.error });
        }
        return false;
      }
    }

    return true;
  } catch {
    setErrors({ general: 'Something went wrong. Please try again.' });
    return false;
  } finally {
    setSaving(false);
  }
}
