'use client';

import { EntityCreateEditPage } from '@/components/create/EntityCreateEditPage';
import { loanConfig } from '@/config/entity-configs';
import type { LoanFormData } from '@/lib/validation';

export default function CreateLoanPage() {
  return <EntityCreateEditPage<LoanFormData> entityType="loan" config={loanConfig} />;
}
