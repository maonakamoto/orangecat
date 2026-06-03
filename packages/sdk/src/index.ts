/**
 * @orangecat/sdk — official TypeScript client for the OrangeCat platform API (v1).
 *
 * See README.md for usage. Authoritative machine-readable contract:
 * https://orangecat.ch/api/v1/openapi.json
 */

export { OrangeCatClient } from './client.js';
export type { ListParams } from './client.js';
export { OrangeCatError } from './errors.js';
export type { OrangeCatErrorCode } from './errors.js';
export type { ClientOptions, RequestOptions } from './http.js';
export { verifyWebhookSignature } from './webhooks.js';
export type {
  VerifyWebhookSignatureOpts,
  WebhookVerifyReason,
  WebhookVerifyResult,
} from './webhooks.js';
export type {
  BaseEntityResponse,
  CreateOptions,
  CreateProductInput,
  ProductResponse,
  CreateServiceInput,
  ServiceResponse,
  CreateProjectInput,
  ProjectResponse,
  CreateCauseInput,
  CauseResponse,
  CreateEventInput,
  EventResponse,
  CreateLoanInput,
  LoanResponse,
  CreateInvestmentInput,
  InvestmentResponse,
  CreateAssetInput,
  AssetResponse,
  CreateWishlistInput,
  WishlistResponse,
  DiscoveryResponse,
} from './types.js';
