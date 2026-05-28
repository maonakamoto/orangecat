'use client';

import { useRequireAuth } from '@/hooks/useAuth';
import Loading from '@/components/Loading';
import { Lock } from 'lucide-react';
import EntityListShell from '@/components/entity/EntityListShell';
import { useSettingsForm } from './useSettingsForm';
import { SettingsEmailSection } from './SettingsEmailSection';
import { SettingsPasswordSection } from './SettingsPasswordSection';
import { SettingsSecuritySection } from './SettingsSecuritySection';
import { SettingsDangerSection } from './SettingsDangerSection';
import { SettingsModals } from './SettingsModals';

export default function SettingsPage() {
  const { user, isLoading } = useRequireAuth();
  const {
    formData,
    isSubmittingEmail,
    isSubmittingPassword,
    isDeleting,
    deleteAccountConfirm,
    setDeleteAccountConfirm,
    showPassword,
    setShowPassword,
    showMFASetup,
    setShowMFASetup,
    showRecoveryCodes,
    setShowRecoveryCodes,
    mfaStatusKey,
    refreshMFAStatus,
    handleInputChange,
    handleEmailUpdate,
    handlePasswordSubmit,
    handleDeleteAccount,
    executeDeleteAccount,
  } = useSettingsForm(user ?? null);

  if (isLoading) {
    return <Loading fullScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <EntityListShell
        title="Account Settings"
        description="Manage your email, password, and security"
      >
        <div className="bg-card rounded-lg shadow-sm border border-border-subtle overflow-hidden">
          <div className="bg-foreground px-6 py-6">
            <div className="flex items-center text-white">
              <Lock className="w-8 h-8 mr-4" />
              <div>
                <h2 className="text-2xl font-semibold">Account & Security</h2>
                <p className="text-tiffany-100 text-base mt-1">
                  Manage your login credentials and account security
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-10">
            <SettingsEmailSection
              email={formData.email}
              isSubmitting={isSubmittingEmail}
              onChange={handleInputChange}
              onSubmit={handleEmailUpdate}
            />
            <SettingsPasswordSection
              newPassword={formData.newPassword}
              confirmPassword={formData.confirmPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              isSubmitting={isSubmittingPassword}
              onChange={handleInputChange}
              onSubmit={handlePasswordSubmit}
            />
            <SettingsSecuritySection
              mfaStatusKey={mfaStatusKey}
              onEnableMFA={() => setShowMFASetup(true)}
              onViewRecoveryCodes={() => setShowRecoveryCodes(true)}
              onMFADisableComplete={refreshMFAStatus}
            />
            <SettingsDangerSection isDeleting={isDeleting} onDelete={handleDeleteAccount} />
          </div>
        </div>
      </EntityListShell>

      <SettingsModals
        showMFASetup={showMFASetup}
        setShowMFASetup={setShowMFASetup}
        showRecoveryCodes={showRecoveryCodes}
        setShowRecoveryCodes={setShowRecoveryCodes}
        deleteAccountConfirm={deleteAccountConfirm}
        setDeleteAccountConfirm={setDeleteAccountConfirm}
        onMFASetupComplete={() => {
          setShowMFASetup(false);
          refreshMFAStatus();
          setShowRecoveryCodes(true);
        }}
        onDeleteConfirm={executeDeleteAccount}
      />
    </>
  );
}
