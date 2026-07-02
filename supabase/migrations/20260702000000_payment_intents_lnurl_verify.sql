-- LNURL-verify (LUD-21) support: lightning-address invoices can carry a verify URL
-- returned by the LNURL-pay callback. Polling it lets us settle lightning_address
-- payments trustlessly instead of falling back to buyer "I've paid" confirmation.
ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS lnurl_verify_url text;

COMMENT ON COLUMN payment_intents.lnurl_verify_url IS
  'LUD-21 verify URL from the LNURL-pay callback; polled to auto-detect settlement for lightning_address payments.';
