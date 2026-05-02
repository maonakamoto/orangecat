'use client';

import { useState, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import { enrollMFA, verifyMFAEnrollment } from '@/services/supabase/auth';

export interface EnrollmentData {
  id: string;
  totpUri: string;
  secret: string;
  qrCode: string;
}

export type SetupStep = 'start' | 'scan' | 'verify' | 'complete';

interface UseMFASetupParams {
  onSetupComplete?: () => void;
}

export function useMFASetup({ onSetupComplete }: UseMFASetupParams) {
  const [step, setStep] = useState<SetupStep>('start');
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  const handleStartEnrollment = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: enrollError } = await enrollMFA();
      if (enrollError || !data) {
        setError(enrollError?.message || 'Failed to start MFA enrollment');
        return;
      }
      setEnrollmentData(data);
      setStep('scan');
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVerify = useCallback(async () => {
    if (!enrollmentData || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { success, error: verifyError } = await verifyMFAEnrollment(
        enrollmentData.id,
        verificationCode
      );
      if (verifyError || !success) {
        setError(verifyError?.message || 'Invalid verification code. Please try again.');
        return;
      }
      setStep('complete');
      onSetupComplete?.();
    } catch {
      setError('An unexpected error occurred during verification');
    } finally {
      setLoading(false);
    }
  }, [enrollmentData, verificationCode, onSetupComplete]);

  const handleCopySecret = useCallback(() => {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(enrollmentData.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  }, [enrollmentData?.secret]);

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
  };

  return {
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
  };
}
