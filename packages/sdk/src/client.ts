/**
 * OrangeCatClient — main entry point for @orangecat/sdk.
 *
 * Pattern: resource namespaces. Each entity gets its own object exposing
 * the methods supported in the current API version. v0.1 supports
 * `.create()` only — `.list()` / `.get()` / `.update()` arrive when the
 * server exposes GET/PUT under /v1.
 *
 * Usage (FleetCrown, hirn.li, third parties):
 *
 *   import { OrangeCatClient } from '@orangecat/sdk';
 *
 *   const orangecat = new OrangeCatClient({
 *     apiKey: process.env.ORANGECAT_API_KEY!,
 *   });
 *
 *   const service = await orangecat.services.create({
 *     title: 'Claude Max',
 *     category: 'subscription',
 *     fixed_price: 0.001,
 *     currency: 'BTC',
 *   });
 */

import { HttpClient, type ClientOptions, type RequestOptions } from './http.js';
import type {
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

const V1 = '/api/v1';

class EntityResource<Input, Response> {
  constructor(
    private readonly http: HttpClient,
    private readonly path: string
  ) {}

  create(input: Input, options?: RequestOptions): Promise<Response> {
    return this.http.post<Response>(this.path, input, options);
  }
}

export class OrangeCatClient {
  private readonly http: HttpClient;

  readonly products: EntityResource<CreateProductInput, ProductResponse>;
  readonly services: EntityResource<CreateServiceInput, ServiceResponse>;
  readonly projects: EntityResource<CreateProjectInput, ProjectResponse>;
  readonly causes: EntityResource<CreateCauseInput, CauseResponse>;
  readonly events: EntityResource<CreateEventInput, EventResponse>;
  readonly loans: EntityResource<CreateLoanInput, LoanResponse>;
  readonly investments: EntityResource<CreateInvestmentInput, InvestmentResponse>;
  readonly assets: EntityResource<CreateAssetInput, AssetResponse>;
  readonly wishlists: EntityResource<CreateWishlistInput, WishlistResponse>;

  constructor(options: ClientOptions) {
    this.http = new HttpClient(options);
    this.products = new EntityResource(this.http, `${V1}/products`);
    this.services = new EntityResource(this.http, `${V1}/services`);
    this.projects = new EntityResource(this.http, `${V1}/projects`);
    this.causes = new EntityResource(this.http, `${V1}/causes`);
    this.events = new EntityResource(this.http, `${V1}/events`);
    this.loans = new EntityResource(this.http, `${V1}/loans`);
    this.investments = new EntityResource(this.http, `${V1}/investments`);
    this.assets = new EntityResource(this.http, `${V1}/assets`);
    this.wishlists = new EntityResource(this.http, `${V1}/wishlists`);
  }

  /**
   * Confirm the server speaks v1 of the contract — SDK consumers should
   * call this once at startup and fail fast if the server is on a
   * different major version (suggesting they should upgrade the SDK).
   */
  discovery(options?: RequestOptions): Promise<DiscoveryResponse> {
    return this.http.get<DiscoveryResponse>(V1, options);
  }
}
