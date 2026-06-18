-- Assets were invisible to everyone but their owner: the only SELECT policy on
-- `assets` was `owner_id = auth.uid()`. So every asset detail page (/assets/[id])
-- rendered "Asset Not Found" for anonymous visitors, and assets never appeared in
-- discover — even after being published. Products, services and events all expose a
-- status-based public read (`status='active' OR owner`); assets simply never got one.
--
-- (A `public_visibility` boolean exists but is created `false` and nothing ever sets it
--  true — it was a half-built gate, not a working privacy control. Visibility here is
--  status-driven, consistent with every other public entity: active = public, draft =
--  owner-only. The matching `.eq('public_visibility', true)` gate is also being removed
--  from the two discover asset queries in the same change.)

CREATE POLICY assets_public_select ON public.assets
  FOR SELECT
  USING (status = 'active');
