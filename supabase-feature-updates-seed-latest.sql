begin;

-- Seed data for latest feature updates
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
values 
(
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
),
(
  'tenant-subdomain-and-auth-flow-improvements',
  'Tenant Subdomain dan Alur Login Kini Lebih Rapi',
  'v1.2.0',
  'Kami merilis pembaruan pengalaman multi-tenant yang membuat setiap bisnis memiliki akses sistem POS melalui subdomain masing-masing, dengan alur login dan logout yang lebih konsisten.',
  E'Pembaruan ini menghadirkan pengalaman tenant yang lebih matang untuk setiap bisnis yang menggunakan Aegis POS.\n\nSekarang setiap bisnis dapat diakses melalui subdomain tenant masing-masing, seperti namatoko.aegis.socialbrand1980.com. Struktur ini membuat pengalaman penggunaan terasa lebih personal, lebih terpisah antar bisnis, dan lebih siap untuk skala multi-tenant.\n\nKami juga menyempurnakan alur autentikasi agar perpindahan dari domain utama ke subdomain tenant berjalan lebih stabil. Setelah login, pengguna akan diarahkan ke dashboard tenant sebagai halaman awal, sehingga mereka dapat melihat ringkasan bisnis terlebih dahulu sebelum melanjutkan ke halaman operasional lain seperti POS, Orders, Products, Members, atau Settings.\n\nUntuk pengalaman keluar akun yang lebih konsisten, logout sekarang akan tetap berada di subdomain tenant yang sama. Dengan begitu, pengguna dapat langsung login kembali tanpa harus navigasi ulang ke subdomain bisnis mereka.\n\nDi balik layar, pembaruan ini juga memperkuat fondasi routing subdomain dan penanganan sesi tenant agar lebih siap dipakai di lingkungan production. Tujuannya adalah membuat pengalaman akses bisnis terasa lebih rapi, lebih profesional, dan lebih mudah dikelola ketika jumlah tenant terus bertambah.',
  '[
    "Setiap bisnis kini dapat diakses melalui subdomain tenant masing-masing.",
    "Setelah login, pengguna diarahkan ke dashboard tenant sebagai halaman awal.",
    "Logout kini tetap berada di subdomain tenant agar login ulang lebih mudah.",
    "Fondasi multi-tenant diperkuat agar transisi domain utama ke subdomain lebih stabil.",
    "Pengalaman akses bisnis terasa lebih personal dan lebih siap untuk skala production."
  ]'::jsonb,
  'published',
  false,
  now() - interval '7 days',
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

commit;
