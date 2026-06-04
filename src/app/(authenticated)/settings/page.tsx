'use client';

import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useAuth';
import Loading from '@/components/Loading';
import { Bell, BrainCircuit, ChevronRight, KeyRound, Lock } from 'lucide-react';
import EntityListShell from '@/components/entity/EntityListShell';
import { ROUTES } from '@/config/routes';
import { useSettingsForm } from './useSettingsForm';
import { SettingsEmailSection } from './SettingsEmailSection';
import { SettingsPasswordSection } from './SettingsPasswordSection';
import { SettingsSecuritySection } from './SettingsSecuritySection';
import { SettingsDangerSection } from './SettingsDangerSection';
import { SettingsModals } from './SettingsModals';

const SETTINGS_SUB_PAGES: Array<{
  href: string;
  icon: typeof Bell;
  label: string;
  description: string;
}> = [
  {
    href: ROUTES.SETTINGS_NOTIFICATIONS,
    icon: Bell,
    label: 'Notifications',
    description: 'Pick which emails you receive and how often you get the digest.',
  },
  {
    href: ROUTES.SETTINGS_AI,
    icon: BrainCircuit,
    label: 'AI assistants',
    description: 'Bring-your-own-key models, defaults, and routing.',
  },
  {
    href: ROUTES.SETTINGS_INTEGRATIONS,
    icon: KeyRound,
    label: 'Integrations',
    description: 'Integration keys + webhook endpoints for external services.',
  },
];

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
                <p className="text-background/70 text-base mt-1">
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

        <div className="mt-6 rounded-lg border border-border-subtle bg-card">
          <div className="border-b border-border-subtle px-4 py-3">
            <h2 className="text-sm font-medium text-foreground">More settings</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Configuration that lives outside the account-and-security card above.
            </p>
          </div>
          <ul className="divide-y divide-border-subtle">
            {SETTINGS_SUB_PAGES.map(page => {
              const Icon = page.icon;
              return (
                <li key={page.href}>
                  <Link href={page.href} className="flex items-center gap-3 p-4 hover:bg-muted/30">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{page.label}</div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{page.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
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
