'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loan } from '@/types/loans';
import { formatCurrency } from '@/services/currency';
import { PLATFORM_DEFAULT_CURRENCY, CURRENCY_CODES } from '@/config/currencies';
import type { CurrencyCode } from '@/config/currencies';
import loansService from '@/services/loans';

export const formatLoanAmount = (amount: number, currency: string = PLATFORM_DEFAULT_CURRENCY) => {
  const validCurrency = (
    CURRENCY_CODES.includes(currency as CurrencyCode) ? currency : PLATFORM_DEFAULT_CURRENCY
  ) as CurrencyCode;
  return formatCurrency(amount, validCurrency);
};

export const calculateProgress = (original: number, remaining: number) => {
  if (original === 0) {
    return 0;
  }
  return ((original - remaining) / original) * 100;
};

export function useLoanList(onLoanUpdated?: () => void) {
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [offersDialogOpen, setOffersDialogOpen] = useState(false);
  const [editLoan, setEditLoan] = useState<Loan | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [confirmDeleteLoan, setConfirmDeleteLoan] = useState<Loan | null>(null);

  const handleToggleVisibility = async (loan: Loan) => {
    try {
      const result = await loansService.updateLoan(loan.id, { is_public: !loan.is_public });
      if (result.success) {
        toast.success(loan.is_public ? 'Loan hidden' : 'Loan made public');
        onLoanUpdated?.();
      } else {
        toast.error(result.error || 'Failed to update visibility');
      }
    } catch {
      toast.error('Failed to update visibility');
    }
  };

  const handleViewOffers = (loan: Loan) => {
    setSelectedLoan(loan);
    setOffersDialogOpen(true);
  };

  const executeDelete = async (loan: Loan) => {
    try {
      const result = await loansService.deleteLoan(loan.id);
      if (result.success) {
        toast.success('Loan deleted');
        onLoanUpdated?.();
      } else {
        toast.error(result.error || 'Failed to delete loan');
      }
    } catch {
      toast.error('Failed to delete loan');
    }
  };

  const handleEdit = (loan: Loan) => {
    setEditLoan(loan);
    setEditDialogOpen(true);
  };

  return {
    selectedLoan,
    offersDialogOpen,
    setOffersDialogOpen,
    editLoan,
    setEditLoan,
    editDialogOpen,
    setEditDialogOpen,
    confirmDeleteLoan,
    setConfirmDeleteLoan,
    handleToggleVisibility,
    handleViewOffers,
    executeDelete,
    handleEdit,
  };
}
