'use client';

import Image from 'next/image';
import { Shield, Smartphone, Copy, Check, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/Card';
import { useMFASetup } from './useMFASetup';

export { MFAStatus } from './MFAStatus';

interface MFASetupProps {
  onSetupComplete?: () => void;
  onCancel?: () => void;
}

export function MFASetup({ onSetupComplete, onCancel }: MFASetupProps) {
  const {
    step,
    setStep,
    enrollmentData,
    verificationCode,
    loading,
    error,
    secretCopied,
    handleStartEnrollment,
    handleVerify,
    handleCopySecret,
    handleCodeChange,
  } = useMFASetup({ onSetupComplete });

  const renderStepContent = () => {
    switch (step) {
      case 'start':
        return (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-tiffany-light rounded-full">
                <Shield className="h-12 w-12 text-tiffany" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Secure Your Account</h3>
              <p className="text-sm text-muted-foreground">
                Two-factor authentication adds an extra layer of security to your account. You'll
                need to enter a code from your authenticator app each time you sign in.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Install an authenticator app
                  </p>
                  <p className="text-xs text-muted-foreground">
                    We recommend Google Authenticator, Authy, or 1Password.
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={handleStartEnrollment} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Set Up Two-Factor Authentication
                </>
              )}
            </Button>
          </div>
        );

      case 'scan':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Scan QR Code</h3>
              <p className="text-sm text-muted-foreground">
                Open your authenticator app and scan this QR code to add your account.
              </p>
            </div>
            {enrollmentData?.qrCode && (
              <div className="flex justify-center">
                <div className="p-4 bg-card border-2 border-border rounded-lg">
                  <Image
                    src={enrollmentData.qrCode}
                    alt="QR Code for authenticator app"
                    width={192}
                    height={192}
                    className="w-48 h-48"
                    unoptimized
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                Can't scan? Enter this code manually:
              </p>
              <div className="flex items-center gap-2 p-2 bg-muted rounded border border-border">
                <code className="flex-1 text-xs font-mono text-foreground break-all">
                  {enrollmentData?.secret}
                </code>
                <button
                  onClick={handleCopySecret}
                  className="p-1.5 text-muted-foreground hover:text-gray-700 dark:hover:text-foreground hover:bg-gray-100 dark:hover:bg-muted rounded transition-colors"
                  title="Copy to clipboard"
                >
                  {secretCopied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button onClick={() => setStep('verify')} className="w-full">
              Continue
            </Button>
          </div>
        );

      case 'verify':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Verify Setup</h3>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app to verify the setup.
              </p>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="verification-code"
                className="block text-sm font-medium text-foreground"
              >
                Verification Code
              </label>
              <input
                id="verification-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={verificationCode}
                onChange={handleCodeChange}
                placeholder="000000"
                className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-border-strong rounded-lg focus:ring-2 focus:ring-tiffany focus:border-tiffany dark:bg-muted dark:text-foreground"
                maxLength={6}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('scan')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleVerify}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-green-100 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Two-Factor Authentication Enabled
              </h3>
              <p className="text-sm text-muted-foreground">
                Your account is now protected with two-factor authentication. You'll need to enter a
                code from your authenticator app each time you sign in.
              </p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> Make sure to save your recovery codes. You'll need them
                if you lose access to your authenticator app.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-tiffany" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>Protect your account with an authenticator app</CardDescription>
      </CardHeader>
      <CardContent>
        {error && step !== 'verify' && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {renderStepContent()}
      </CardContent>
      {onCancel && step !== 'complete' && (
        <CardFooter>
          <Button variant="ghost" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default MFASetup;
