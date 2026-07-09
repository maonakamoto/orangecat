import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRequireAuth } from '@/hooks/useAuth';
import { useEntityList } from '@/hooks/useEntityList';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { useBulkDelete } from '@/hooks/useBulkDelete';
import { loanEntityConfig } from '@/config/entities/loans';
import { Loan, LoanOffer } from '@/types/loans';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import loansService from '@/services/loans';

type ActiveTab = 'my-loans' | 'available' | 'offers';

const AVAILABLE_PAGE_SIZE = 12;

export function useLoanList() {
  const { user, isLoading, hydrated } = useRequireAuth();
  const { selectedIds, toggleSelect, toggleSelectAll, clearSelection } = useBulkSelection();

  const [showSelection, setShowSelection] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('my-loans');
  const [myOffers, setMyOffers] = useState<LoanOffer[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<LoanOffer[]>([]);
  const [availableLoans, setAvailableLoans] = useState<Loan[]>([]);
  const [availablePage, setAvailablePage] = useState(1);
  const [availableTotal, setAvailableTotal] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const {
    items: myLoans,
    loading,
    error,
    page,
    total,
    setPage,
    refresh,
  } = useEntityList<Loan>({
    apiEndpoint: loanEntityConfig.apiEndpoint,
    userId: user?.id,
    limit: 12,
    enabled: !!user?.id && hydrated && !isLoading && activeTab === 'my-loans',
  });

  const memoizedLoans = useMemo(() => myLoans, [myLoans]);

  const loadOffers = useCallback(async () => {
    try {
      const result = await loansService.getUserOffers();
      if (result.success) {
        setMyOffers(result.offers || []);
      }
    } catch (err) {
      logger.error('Failed to load offers', { error: err }, 'LoansPage');
    }
  }, []);

  const loadIncomingOffers = useCallback(async () => {
    try {
      const result = await loansService.getIncomingOffers();
      if (result.success) {
        setIncomingOffers(result.offers || []);
      }
    } catch (err) {
      logger.error('Failed to load incoming offers', { error: err }, 'LoansPage');
    }
  }, []);

  const loadAvailableLoans = useCallback(async () => {
    try {
      const result = await loansService.getAvailableLoans(undefined, {
        pageSize: AVAILABLE_PAGE_SIZE,
        offset: (availablePage - 1) * AVAILABLE_PAGE_SIZE,
      });
      if (result.success) {
        setAvailableLoans(result.loans || []);
        setAvailableTotal(result.total || 0);
      }
    } catch (err) {
      logger.error('Failed to load available loans', { error: err }, 'LoansPage');
    }
  }, [availablePage]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    if (activeTab === 'offers') {
      loadOffers();
    }
    if (activeTab === 'my-loans') {
      loadIncomingOffers();
    }
    if (activeTab === 'available') {
      loadAvailableLoans();
    }
  }, [activeTab, user?.id, loadIncomingOffers, loadOffers, loadAvailableLoans]);

  const switchTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab !== 'my-loans') {
      clearSelection();
      setShowSelection(false);
    }
  };

  const {
    isDeleting,
    bulkDeleteConfirm,
    setBulkDeleteConfirm,
    handleBulkDelete,
    executeBulkDelete,
  } = useBulkDelete({
    selectedIds,
    apiEndpoint: loanEntityConfig.apiEndpoint,
    entityName: 'Loan',
    entityNamePlural: 'Loans',
    clearSelection,
    refresh,
  });

  const handleLoanCreated = () => {
    setCreateDialogOpen(false);
    refresh();
    loadOffers();
    loadIncomingOffers();
    loadAvailableLoans();
    toast.success('Loan created successfully!');
  };

  return {
    user,
    isLoading,
    hydrated,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    isDeleting,
    showSelection,
    setShowSelection,
    bulkDeleteConfirm,
    setBulkDeleteConfirm,
    activeTab,
    switchTab,
    myLoans: memoizedLoans,
    myOffers,
    incomingOffers,
    availableLoans,
    availablePage,
    setAvailablePage,
    availableTotal,
    availablePageSize: AVAILABLE_PAGE_SIZE,
    createDialogOpen,
    setCreateDialogOpen,
    loading,
    error,
    page,
    total,
    setPage,
    loadOffers,
    loadIncomingOffers,
    loadAvailableLoans,
    refresh,
    handleBulkDelete,
    executeBulkDelete,
    handleLoanCreated,
    clearSelection,
  };
}
