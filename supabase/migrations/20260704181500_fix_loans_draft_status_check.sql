-- Fix POST /api/loans returning 500 on create.
--
-- Root cause: createLoan() inserts status='draft' (STATUS.LOANS.DRAFT) but
-- loans_status_check only allowed active|paid_off|refinanced|defaulted|cancelled.
-- Any draft insert fails with SQLSTATE 23514.
--
-- Align the constraint with the app SSOT (database-constants STATUS.LOANS).

ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_status_check;

ALTER TABLE public.loans
  ADD CONSTRAINT loans_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'draft',
        'active',
        'paid_off',
        'refinanced',
        'defaulted',
        'cancelled'
      ]::text[]
    )
  );
