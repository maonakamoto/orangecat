-- Currency-convention cleanup: events store ticket_price / funding_goal in the
-- entity's chosen `currency` (events has a `currency` column), NOT in BTC — exactly
-- like products (price) and services (fixed_price/hourly_rate). But the columns were
-- misnamed with a `_btc` suffix, which (a) lies about the unit and (b) would eventually
-- make a 50 CHF ticket render as 50 BTC if any display code trusted the suffix.
--
-- The architecture doc (docs/architecture/CURRENCY_AND_BITCOIN_ARCHITECTURE.md) already
-- specifies `ticket_price` (in currency) — the `_btc` column names are the drift, not
-- the spec. Rename to match (RENAME COLUMN is atomic and preserves all data).
--
-- Convention codified by this cleanup:
--   * PRICES (a fiat commitment that should NOT drift with the BTC rate) → stored in the
--     nominal `currency`, neutral column name: products.price, services.fixed_price,
--     events.ticket_price/funding_goal, assets.rental_price/sale_price/deposit_amount.
--   * BTC-NATIVE VALUE (donations, balances, settled transfers) → stored in BTC, `_btc`
--     suffix: wallets.balance_btc, contributions.amount_btc, transactions.amount_btc,
--     research_entities.funding_goal_btc (no currency col — research is BTC-native),
--     wishlist_items.target_amount_btc.
--
-- (assets.*_btc carry the same mislabeling and are a follow-up — their columns are read
--  by display code, so that rename needs its own coordinated change.)

ALTER TABLE public.events RENAME COLUMN ticket_price_btc TO ticket_price;
ALTER TABLE public.events RENAME COLUMN funding_goal_btc TO funding_goal;
