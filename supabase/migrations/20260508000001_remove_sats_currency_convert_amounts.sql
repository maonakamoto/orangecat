-- Remove SATS as a valid currency code and convert legacy satoshi amounts to BTC.
--
-- The sats→BTC migration (20260404000006) converted _sats columns to _btc,
-- but left generic price/goal_amount columns in satoshi scale when currency = 'SATS'.
-- This migration converts those amounts and tightens the CHECK constraints.

-- Step 1: Convert satoshi amounts to BTC and relabel currency
-- user_products: price column
UPDATE user_products
SET price = price / 100000000.0,
    currency = 'BTC'
WHERE currency = 'SATS';

-- user_services: fixed_price and hourly_rate
UPDATE user_services
SET fixed_price = CASE WHEN fixed_price IS NOT NULL THEN fixed_price / 100000000.0 END,
    hourly_rate = CASE WHEN hourly_rate IS NOT NULL THEN hourly_rate / 100000000.0 END,
    currency = 'BTC'
WHERE currency = 'SATS';

-- projects: goal_amount and raised_amount
UPDATE projects
SET goal_amount = CASE WHEN goal_amount IS NOT NULL THEN goal_amount / 100000000.0 END,
    raised_amount = CASE WHEN raised_amount IS NOT NULL THEN raised_amount / 100000000.0 END,
    currency = 'BTC'
WHERE currency = 'SATS';

-- user_causes: goal_amount and total_raised
UPDATE user_causes
SET goal_amount = CASE WHEN goal_amount IS NOT NULL THEN goal_amount / 100000000.0 END,
    total_raised = CASE WHEN total_raised IS NOT NULL THEN total_raised / 100000000.0 END,
    currency = 'BTC'
WHERE currency = 'SATS';

-- Step 2: Drop SATS from CHECK constraints on all affected tables
ALTER TABLE user_products
  DROP CONSTRAINT IF EXISTS user_products_currency_check,
  ADD CONSTRAINT user_products_currency_check
    CHECK (currency IN ('USD', 'EUR', 'CHF', 'BTC', 'GBP'));

ALTER TABLE user_services
  DROP CONSTRAINT IF EXISTS user_services_currency_check,
  ADD CONSTRAINT user_services_currency_check
    CHECK (currency IN ('USD', 'EUR', 'CHF', 'BTC', 'GBP'));

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_currency_check,
  ADD CONSTRAINT projects_currency_check
    CHECK (currency IN ('USD', 'EUR', 'CHF', 'BTC', 'GBP'));

ALTER TABLE user_causes
  DROP CONSTRAINT IF EXISTS user_causes_currency_check,
  ADD CONSTRAINT user_causes_currency_check
    CHECK (currency IN ('USD', 'EUR', 'CHF', 'BTC', 'GBP'));

ALTER TABLE loans
  DROP CONSTRAINT IF EXISTS loans_currency_check,
  ADD CONSTRAINT loans_currency_check
    CHECK (currency IN ('USD', 'EUR', 'CHF', 'BTC', 'GBP'));

ALTER TABLE loan_payments
  DROP CONSTRAINT IF EXISTS loan_payments_currency_check,
  ADD CONSTRAINT loan_payments_currency_check
    CHECK (currency IN ('USD', 'EUR', 'CHF', 'BTC', 'GBP'));

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_currency_check,
  ADD CONSTRAINT events_currency_check
    CHECK (currency IN ('USD', 'EUR', 'CHF', 'BTC', 'GBP'));

ALTER TABLE wallets
  DROP CONSTRAINT IF EXISTS wallets_goal_currency_check,
  ADD CONSTRAINT wallets_goal_currency_check
    CHECK (goal_currency IN ('USD', 'EUR', 'CHF', 'BTC', 'GBP'));
