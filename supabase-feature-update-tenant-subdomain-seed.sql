begin;

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

commit;
