-- User-created equipment stays private to its owner until an admin promotes it
-- into the canonical catalog.
ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_equipment_owner_user
  ON public.equipment(owner_user_id);

DROP POLICY IF EXISTS "equipment_read_all" ON public.equipment;
CREATE POLICY "equipment_read_system_or_own_custom"
  ON public.equipment FOR SELECT
  USING (owner_user_id IS NULL OR owner_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.equipment_addition_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  submitted_name TEXT NOT NULL CHECK (char_length(trim(submitted_name)) BETWEEN 2 AND 120),
  image_url TEXT NOT NULL,
  status recommendation_status NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_addition_requests_status
  ON public.equipment_addition_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_addition_requests_user
  ON public.equipment_addition_requests(user_id, created_at DESC);

ALTER TABLE public.equipment_addition_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipment_requests_select_own" ON public.equipment_addition_requests;
CREATE POLICY "equipment_requests_select_own"
  ON public.equipment_addition_requests FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "equipment_requests_insert_own" ON public.equipment_addition_requests;
CREATE POLICY "equipment_requests_insert_own"
  ON public.equipment_addition_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "equipment_requests_update_own_pending" ON public.equipment_addition_requests;
CREATE POLICY "equipment_requests_update_own_pending"
  ON public.equipment_addition_requests FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
