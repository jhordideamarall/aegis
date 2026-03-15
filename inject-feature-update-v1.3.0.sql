-- ============================================
-- AEGIS POS - CRITICAL SECURITY & PERFORMANCE UPDATE
-- Version: v1.3.0
-- ============================================
-- INSTRUKSI:
-- 1. Buka Supabase Dashboard → SQL Editor
-- 2. Copy SEMUA isi file ini
-- 3. Paste dan klik "Run"
-- 4. Tunggu "Success"
-- ============================================

begin;

-- Insert or update feature update v1.3.0
insert into public.feature_updates (
  slug,
  title,
  version,
  summary,
  content,
  highlights,
  status,
  featured,
  published_at,
  created_by_email,
  updated_at
)
values (
  'critical-security-and-performance-improvements',
  'Perbaikan Critical: Race Condition Stock Update & Validasi Points',
  'v1.3.0',
  'Kami telah memperbaiki beberapa masalah critical termasuk race condition pada update stock produk, validasi points member yang bisa negatif, dan peningkatan timezone handling.',
  E'Pembaruan ini membawa perbaikan penting untuk stabilitas dan keamanan sistem Aegis POS.\n\n**Race Condition Stock Update**\n\nKami memperbaiki masalah race condition yang bisa terjadi ketika ada multiple orders untuk produk yang sama secara bersamaan. Sekarang stock update menggunakan atomic update dengan validasi kondisi, memastikan stock tidak akan pernah negatif atau salah hitung.\n\n**Validasi Points Member**\n\nSistem sekarang memvalidasi points member sebelum redeem, mencegah points menjadi negatif. User akan mendapat error message yang jelas jika mencoba redeem points lebih dari yang tersedia.\n\n**Timezone Handling yang Lebih Baik**\n\nDate/time handling kini menggunakan library `date-fns-tz` dengan timezone Asia/Jakarta yang proper, menggantikan hardcoded offset yang error-prone.\n\n**Search Orders yang Konsisten**\n\nLogic search orders sudah diperbaiki untuk memastikan hasil data dan summary konsisten, dengan filter function yang sama.\n\n**Phone Validation yang Lebih Fleksibel**\n\nValidasi nomor telepon sekarang mendukung berbagai format internasional, tidak hanya format Indonesia.',
  '[
    "Fixed race condition pada stock update dengan atomic update",
    "Validasi points member sebelum redeem untuk mencegah points negatif",
    "Timezone handling menggunakan date-fns-tz dengan Asia/Jakarta timezone",
    "Search orders logic diperbaiki untuk hasil yang konsisten",
    "Phone validation mendukung multiple format internasional"
  ]'::jsonb,
  'published',
  true,
  now(),
  'admin@socialbrand1980.com',
  now()
)
on conflict (slug) do update
set
  title = excluded.title,
  version = excluded.version,
  summary = excluded.summary,
  content = excluded.content,
  highlights = excluded.highlights,
  status = excluded.status,
  featured = excluded.featured,
  published_at = excluded.published_at,
  updated_at = now();

-- Verify insertion
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM feature_updates 
  WHERE slug = 'critical-security-and-performance-improvements';
  
  IF v_count > 0 THEN
    RAISE NOTICE '✅ Feature update v1.3.0 successfully inserted/updated!';
  ELSE
    RAISE NOTICE '❌ Feature update v1.3.0 failed to insert!';
  END IF;
END $$;

commit;

-- ============================================
-- VERIFICATION QUERY
-- Run this separately to check the result
-- ============================================
-- SELECT 
--   slug,
--   title,
--   version,
--   status,
--   featured,
--   published_at,
--   jsonb_array_length(highlights) as highlight_count
-- FROM feature_updates
-- WHERE slug = 'critical-security-and-performance-improvements';
