/**
 * Platform receiving wallet (for Cat Credits top-ups).
 *
 * OrangeCat receives credit purchases into a wallet it controls, configured via
 * a single NWC connection string (PLATFORM_NWC_URI). NWC is an abstraction, so
 * this can point at a hosted wallet now and a self-hosted LNbits/BTCPay node
 * later with no code change. When unset, top-up is simply disabled (the rest of
 * Cat Credits — balance, history, metering — is unaffected).
 *
 * This is OC's OWN revenue wallet. It is unrelated to users' wallets, which stay
 * non-custodial (OC never holds user funds). A user's credit balance is prepaid
 * service credit, not a holding of their bitcoin.
 */

import { NWCClient, isValidNWCUri } from '@/lib/nostr/nwc';

/** The platform NWC connection string, or undefined if not configured. */
export function getPlatformNwcUri(): string | undefined {
  const uri = process.env.PLATFORM_NWC_URI?.trim();
  return uri && isValidNWCUri(uri) ? uri : undefined;
}

/** True when a platform receiving wallet is configured (top-up available). */
export function platformReceiveEnabled(): boolean {
  return !!getPlatformNwcUri();
}

/**
 * A connected NWC client for the platform wallet, or null if not configured.
 * Caller is responsible for `disconnect()`.
 */
export async function getPlatformNwcClient(): Promise<NWCClient | null> {
  const uri = getPlatformNwcUri();
  if (!uri) {
    return null;
  }
  const client = new NWCClient(uri);
  await client.connect();
  return client;
}
