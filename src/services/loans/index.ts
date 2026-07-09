// Import types
import type {
  CreateLoanRequest,
  UpdateLoanRequest,
  LoanResponse,
  LoansListResponse,
  LoansQuery,
  CreateLoanOfferRequest,
  UpdateLoanOfferRequest,
  LoanOfferResponse,
  LoanOffersListResponse,
  LoanOffersQuery,
  CreateLoanPaymentRequest,
  LoanPaymentResponse,
  Loan,
  Pagination,
  LoanCategory,
} from '@/types/loans';

// Import modular functions
import { getLoan, getUserLoans, getAvailableLoans, getLoanCategories } from './queries/loans';
import { getIncomingOffers, getLoanOffers, getUserOffers } from './queries/offers';
import { createLoan, updateLoan, deleteLoan, createObligationLoan } from './mutations/loans';
import { createLoanOffer, updateLoanOffer, respondToOffer } from './mutations/offers';
import { createPayment, completePayment } from './mutations/payments';
import type { ServiceResult } from '@/types/common';

/**
 * LoansService Class
 *
 * Provides a class-based interface for loans operations.
 * Internally uses the modular functions.
 * Maintains backward compatibility with existing code.
 */
class LoansService {
  // ==================== LOAN MANAGEMENT ====================

  async createLoan(request: CreateLoanRequest): Promise<LoanResponse> {
    return createLoan(request);
  }

  async updateLoan(loanId: string, request: UpdateLoanRequest): Promise<LoanResponse> {
    return updateLoan(loanId, request);
  }

  async getLoan(loanId: string): Promise<LoanResponse> {
    return getLoan(loanId);
  }

  async getUserLoans(query?: LoansQuery, pagination?: Pagination): Promise<LoansListResponse> {
    return getUserLoans(query, pagination);
  }

  async getAvailableLoans(query?: LoansQuery, pagination?: Pagination): Promise<LoansListResponse> {
    return getAvailableLoans(query, pagination);
  }

  async deleteLoan(loanId: string): Promise<ServiceResult> {
    return deleteLoan(loanId);
  }

  async createObligationLoan(params: {
    borrowerId: string;
    lenderProfileName: string;
    offer: {
      loan_id: string;
      offer_amount: number;
      interest_rate?: number;
      term_months?: number;
      currency?: string;
    };
  }): Promise<LoanResponse> {
    return createObligationLoan(params);
  }

  // ==================== LOAN OFFER MANAGEMENT ====================

  async createLoanOffer(request: CreateLoanOfferRequest): Promise<LoanOfferResponse> {
    return createLoanOffer(request);
  }

  async updateLoanOffer(
    offerId: string,
    request: UpdateLoanOfferRequest
  ): Promise<LoanOfferResponse> {
    return updateLoanOffer(offerId, request);
  }

  async getLoanOffers(
    loanId: string,
    query?: LoanOffersQuery,
    pagination?: Pagination
  ): Promise<LoanOffersListResponse> {
    return getLoanOffers(loanId, query, pagination);
  }

  async getUserOffers(
    query?: LoanOffersQuery,
    pagination?: Pagination
  ): Promise<LoanOffersListResponse> {
    return getUserOffers(query, pagination);
  }

  async getIncomingOffers(
    query?: LoanOffersQuery,
    pagination?: Pagination
  ): Promise<LoanOffersListResponse> {
    return getIncomingOffers(query, pagination);
  }

  async respondToOffer(
    offerId: string,
    accept: boolean,
    notes?: string
  ): Promise<LoanOfferResponse> {
    return respondToOffer(offerId, accept, notes);
  }

  // ==================== PAYMENT MANAGEMENT ====================

  async createPayment(request: CreateLoanPaymentRequest): Promise<LoanPaymentResponse> {
    return createPayment(request);
  }

  async completePayment(
    paymentId: string,
    options?: { createObligation?: { lenderProfileName: string } }
  ): Promise<LoanPaymentResponse & { obligationLoan?: Loan }> {
    return completePayment(paymentId, options);
  }

  // ==================== LOAN CATEGORIES ====================

  async getLoanCategories(): Promise<{
    success: boolean;
    categories?: LoanCategory[];
    error?: string;
  }> {
    return getLoanCategories();
  }
}

const loansService = new LoansService();
export default loansService;
