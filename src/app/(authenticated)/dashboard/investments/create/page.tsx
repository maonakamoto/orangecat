'use client';

import { EntityCreateEditPage } from '@/components/create/EntityCreateEditPage';
import { investmentConfig } from '@/config/entity-configs';
import type { InvestmentFormData } from '@/lib/validation';

export default function CreateInvestmentPage() {
  return (
    <EntityCreateEditPage<InvestmentFormData> entityType="investment" config={investmentConfig} />
  );
}
