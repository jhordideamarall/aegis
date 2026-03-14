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
  'intelligent-aegis-report-and-payment-documentation',
  'Intelligent Aegis Report dan Dokumentasi Pembayaran Kini Tersedia',
  'v1.1.0',
  'Kami merilis pembaruan reporting yang membuat laporan penjualan terlihat lebih profesional, lebih informatif, dan lebih siap dipakai untuk evaluasi operasional harian maupun kebutuhan audit internal.',
  E'Pembaruan ini menghadirkan Intelligent Aegis Report, yaitu format laporan penjualan yang lebih rapi, lebih lengkap, dan lebih representatif untuk kebutuhan bisnis sehari-hari.\n\nDari halaman Orders, pengguna kini dapat membuka laporan profesional yang menampilkan periode laporan secara jelas, ringkasan performa penjualan, breakdown metode pembayaran, sorotan operasional, tindakan yang direkomendasikan, tabel transaksi terperinci, serta lampiran bukti pembayaran jika tersedia.\n\nSummary di dalam report dibangun dari data transaksi yang benar-benar ada pada periode terpilih. Sistem membaca total transaksi, omzet, rata-rata order, distribusi pembayaran, coverage bukti pembayaran, dominasi QRIS, dan pola hari penjualan terkuat untuk menyusun narasi laporan yang lebih relevan.\n\nKami juga memperluas alur pembayaran digital dengan dukungan QRIS yang lebih fleksibel. Kasir sekarang dapat memilih QRIS dengan provider seperti QRIS Umum, GoPay, DANA, OVO, ShopeePay, QRIS Bank, maupun opsi lainnya. Untuk kebutuhan dokumentasi, transaksi QRIS dan Bank Transfer juga dapat dilengkapi dengan upload foto bukti pembayaran secara opsional.\n\nSelain itu, halaman Orders kini menampilkan detail pembayaran yang lebih kaya, termasuk provider pembayaran dan status bukti pembayaran. Saat melihat detail order, pengguna dapat meninjau catatan pembayaran, waktu upload bukti, serta preview gambar bukti pembayaran apabila dilampirkan.\n\nPembaruan ini dirancang agar laporan bisnis tidak hanya terlihat lebih profesional, tetapi juga lebih siap dipakai untuk review operasional, follow up pembayaran, dan dokumentasi transaksi digital.',
  '[
    "Download Report dari halaman Orders sekarang membuka laporan profesional siap print atau save as PDF.",
    "Report mencakup Executive Summary, Operational Highlights, Recommended Actions, transaction register, dan lampiran bukti pembayaran.",
    "Summary laporan disusun dari data transaksi aktual pada periode yang dipilih, bukan sekadar teks statis.",
    "QRIS kini mendukung provider umum dan detail seperti GoPay, DANA, OVO, ShopeePay, serta QRIS Bank.",
    "Transaksi QRIS dan Bank Transfer dapat menyimpan foto bukti pembayaran secara opsional.",
    "Detail pembayaran pada Orders kini lebih lengkap dan siap dipakai untuk audit internal."
  ]'::jsonb,
  'published',
  true,
  now(),
  'admin@aegis.id',
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
