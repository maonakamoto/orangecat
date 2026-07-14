/**
 * Verify the platform receiving wallet (Cat Credits top-up) end to end.
 *
 * Run this ONCE after setting PLATFORM_NWC_URI on the box, BEFORE flipping the
 * app live (NEXT_PUBLIC_CAT_CREDITS_LIVE=true). It proves the configured NWC
 * connection can actually receive — validating the URI, connecting to the relay,
 * reading wallet info + balance, and minting a real (tiny) invoice — without
 * moving any money. If every step passes, top-up will work for real users.
 *
 * Usage (on the box, where PLATFORM_NWC_URI is set):
 *   cd /opt/orangecat/app && PLATFORM_NWC_URI="$PLATFORM_NWC_URI" npx tsx scripts/bitcoin/verify-platform-wallet.ts
 *
 * Or locally, pasting the URI inline (never commit it):
 *   PLATFORM_NWC_URI='nostr+walletconnect://...' npx tsx scripts/bitcoin/verify-platform-wallet.ts
 */

import { NWCClient, isValidNWCUri } from '@/lib/nostr/nwc';

const PROBE_AMOUNT_SATS = 10; // ~0.0000001 BTC — minted, never paid

function ok(msg: string) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}
function fail(msg: string): never {
  console.error(`  \x1b[31m✗ ${msg}\x1b[0m`);
  process.exit(1);
}

async function main() {
  console.log('\nVerifying platform receiving wallet (PLATFORM_NWC_URI)…\n');

  const uri = process.env.PLATFORM_NWC_URI?.trim();
  if (!uri) {
    fail('PLATFORM_NWC_URI is not set in this environment.');
  }
  if (!isValidNWCUri(uri)) {
    fail(
      'PLATFORM_NWC_URI is set but malformed — expected nostr+walletconnect://<pubkey>?relay=…&secret=…'
    );
  }
  ok('URI is well-formed');

  const client = new NWCClient(uri);
  try {
    await client.connect();
    ok('Connected to the NWC relay');

    // get_info + get_balance prove the connection is authorized and the wallet
    // is reachable. Some wallets scope permissions, so treat these as best-effort
    // diagnostics — make_invoice below is the capability that actually matters.
    try {
      const info = await client.getInfo();
      const methods = Array.isArray((info as { methods?: unknown }).methods)
        ? (info as { methods: string[] }).methods
        : [];
      ok(
        `Wallet reachable (get_info)${methods.length ? ` — supports: ${methods.join(', ')}` : ''}`
      );
      if (methods.length && !methods.includes('make_invoice')) {
        fail(
          'This NWC connection does not grant make_invoice — top-up needs a receive-capable connection.'
        );
      }
    } catch {
      console.log('  · get_info not permitted by this connection (non-fatal) — continuing');
    }

    try {
      const balance = await client.getBalance();
      ok(`Balance readable: ${Math.round(balance / 1000)} sats`);
    } catch {
      console.log('  · get_balance not permitted by this connection (non-fatal) — continuing');
    }

    // The one that matters: can we mint an invoice to receive into this wallet?
    const invoice = await client.makeInvoice(
      PROBE_AMOUNT_SATS,
      'OrangeCat platform-wallet verification (do not pay)'
    );
    if (!invoice.invoice || !invoice.payment_hash) {
      fail('make_invoice returned no bolt11 / payment_hash.');
    }
    ok(`Minted a ${PROBE_AMOUNT_SATS}-sat invoice — wallet can RECEIVE`);
    console.log(`\n    bolt11: ${invoice.invoice.slice(0, 40)}…`);
    console.log(`    hash:   ${invoice.payment_hash}\n`);

    console.log('\x1b[32mAll checks passed.\x1b[0m The platform wallet can receive.');
    console.log('Next: set NEXT_PUBLIC_CAT_CREDITS_LIVE=true on the box and restart to go live.\n');
  } finally {
    client.disconnect();
  }
}

main().catch(err => fail(err instanceof Error ? err.message : String(err)));
