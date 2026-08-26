-- =====================================================================
-- Migration: Storage buckets setup
-- Project: GymAI Coach
-- =====================================================================
-- Creates two buckets:
--   1. avatars - public, for user profile pictures
--   2. equipment-scans - private, for user-uploaded equipment photos
-- =====================================================================

-- Public bucket for user avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Private bucket for equipment scans (used in TIP-006A)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'equipment-scans',
  'equipment-scans',
  false,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- Storage RLS policies
-- =====================================================================

-- Avatars bucket: anyone can read, owner can write
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Equipment scans bucket: owner-only access (private)
DROP POLICY IF EXISTS "Users can read own equipment scans" ON storage.objects;
CREATE POLICY "Users can read own equipment scans"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'equipment-scans'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can upload own equipment scans" ON storage.objects;
CREATE POLICY "Users can upload own equipment scans"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'equipment-scans'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own equipment scans" ON storage.objects;
CREATE POLICY "Users can delete own equipment scans"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'equipment-scans'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );