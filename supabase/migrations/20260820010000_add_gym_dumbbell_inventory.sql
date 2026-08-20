-- Track the exact dumbbell levels available at each user-owned gym.
-- quantity is the number of individual dumbbells, not the number of pairs.

CREATE TABLE public.gym_dumbbell_inventory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  weight_kg   NUMERIC(6,2) NOT NULL,
  quantity    INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gym_dumbbell_inventory_weight_positive
    CHECK (weight_kg > 0 AND weight_kg <= 200),
  CONSTRAINT gym_dumbbell_inventory_quantity_positive
    CHECK (quantity > 0 AND quantity <= 1000),
  CONSTRAINT gym_dumbbell_inventory_gym_weight_unique
    UNIQUE (gym_id, weight_kg)
);

-- The unique index above starts with gym_id, so it also supports gym-scoped
-- reads, RLS ownership checks and cascading deletes without another index.

CREATE TRIGGER trg_gym_dumbbell_inventory_updated_at
  BEFORE UPDATE ON public.gym_dumbbell_inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.gym_dumbbell_inventory ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.gym_dumbbell_inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.gym_dumbbell_inventory TO service_role;

CREATE POLICY "gym_dumbbells_owner_select"
  ON public.gym_dumbbell_inventory
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.gyms g
      WHERE g.id = gym_id
        AND g.owner_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "gym_dumbbells_owner_insert"
  ON public.gym_dumbbell_inventory
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.gyms g
      WHERE g.id = gym_id
        AND g.owner_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "gym_dumbbells_owner_update"
  ON public.gym_dumbbell_inventory
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.gyms g
      WHERE g.id = gym_id
        AND g.owner_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.gyms g
      WHERE g.id = gym_id
        AND g.owner_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "gym_dumbbells_owner_delete"
  ON public.gym_dumbbell_inventory
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.gyms g
      WHERE g.id = gym_id
        AND g.owner_user_id = (SELECT auth.uid())
    )
  );
