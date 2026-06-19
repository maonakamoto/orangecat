/**
 * Payment Domain — Public API
 *
 * All payment-related functionality exports from here.
 */

// Types
export type {
  PaymentMethod,
  PaymentIntentStatus,
  PaymentIntent,
  Order,
  Contribution,
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentStatusResult,
  ResolvedWallet,
} from './types';

// Services
export { initiatePayment, checkPaymentStatus, buyerConfirmPayment } from './paymentFlowService';
export {
  resolveSellerWallet,
  resolveSellerReceiveInfo,
  getSellerUserId,
} from './walletResolutionService';
export type { SellerReceiveInfo } from './walletResolutionService';
export { generateInvoice } from './invoiceGenerationService';
export { encrypt, decrypt } from './encryptionService';
