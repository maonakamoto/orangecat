-- Allow payment parties to mark loan payments completed (payoff handoff).
-- INSERT/SELECT policies existed from baseline; UPDATE was missing, blocking
-- POST /api/loans/payments/:id/complete.

CREATE POLICY "Payment parties can update payments"
ON public.loan_payments
FOR UPDATE
USING (auth.uid() = payer_id OR auth.uid() = recipient_id)
WITH CHECK (auth.uid() = payer_id OR auth.uid() = recipient_id);
