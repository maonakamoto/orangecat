-- Fix infinite recursion (Postgres 42P17) in the loan_offers SELECT policy.
--
-- The baseline "Loan owners and offerers can view offers" policy referenced
-- loan_offers from inside its own USING clause:
--
--   ... UNION SELECT loan_offers_1.offerer_id
--         FROM public.loan_offers loan_offers_1
--        WHERE loan_offers_1.id = loan_offers_1.id   -- self-reference + tautology
--
-- Reading loan_offers re-invokes the same policy, so every offers read errors
-- with "infinite recursion detected in policy for relation loan_offers",
-- breaking getLoanOffers / getUserOffers / getIncomingOffers (the My Loans and
-- offer surfaces).
--
-- Recreate it with the intent the sibling UPDATE policy already uses: the loan
-- owner OR the offerer may view an offer — checked directly (offerer_id column)
-- without querying loan_offers again. No access is widened.

DROP POLICY IF EXISTS "Loan owners and offerers can view offers" ON public.loan_offers;

CREATE POLICY "Loan owners and offerers can view offers"
  ON public.loan_offers
  FOR SELECT
  USING (
    ((SELECT auth.uid()) IN (
      SELECT loans.user_id
      FROM public.loans
      WHERE loans.id = loan_offers.loan_id
    ))
    OR ((SELECT auth.uid()) = offerer_id)
  );
