export interface MarketingSection {
  id?: string
  title: string
  body: string
  points?: string[]
}

export interface MarketingPageContent {
  slug: string
  badge: string
  title: string
  description: string
  highlights: string[]
  sections: MarketingSection[]
  primaryCta: {
    label: string
    href: string
  }
  secondaryCta?: {
    label: string
    href: string
  }
}

export const marketingPages: Record<string, MarketingPageContent> = {
  features: {
    slug: 'features',
    badge: 'Feature Overview',
    title: 'Fitur lengkap untuk operasional kasir yang lebih tertata',
    description:
      'Aegis POS menggabungkan transaksi, produk, member, pembayaran digital, laporan, dan branding bisnis dalam satu sistem yang lebih rapi dipakai harian.',
    highlights: [
      'Checkout cepat dengan alur kasir yang sederhana',
      'QRIS, bank transfer, dan dokumentasi bukti pembayaran',
      'Dashboard performa bisnis dan report PDF profesional',
      'Branding bisnis per tenant termasuk logo dan nama PIC'
    ],
    sections: [
      {
        id: 'pos-flow',
        title: 'Kasir yang cepat dipelajari',
        body:
          'Halaman POS dirancang untuk mempersingkat proses checkout, memudahkan pencarian produk, dan menjaga alur pembayaran tetap jelas bagi kasir baru maupun tim yang sudah rutin bertugas.',
        points: [
          'Pencarian produk dan filter kategori',
          'Keranjang belanja dengan kontrol kuantitas',
          'Pemilihan member serta redeem poin',
          'Struk thermal siap cetak'
        ]
      },
      {
        id: 'payments',
        title: 'Kontrol pembayaran lebih detail',
        body:
          'Pembayaran digital tidak hanya dicatat sebagai metode bayar, tetapi bisa dibedakan sampai provider QRIS, bank transfer, dan lampiran bukti pembayaran bila diperlukan.',
        points: [
          'Cash, debit, QRIS, dan bank transfer',
          'Provider QRIS umum, GoPay, DANA, OVO, ShopeePay, dan QRIS bank',
          'Upload bukti pembayaran opsional',
          'Tampil rapi di detail order dan report'
        ]
      },
      {
        id: 'reporting',
        title: 'Report yang siap dipakai owner',
        body:
          'Dari halaman order, bisnis bisa menghasilkan report PDF yang merangkum performa penjualan, breakdown pembayaran, highlight operasional, dan lampiran bukti transaksi.',
        points: [
          'Executive summary berdasarkan data aktual',
          'Lampiran foto bukti pembayaran',
          'Filter periode, metode bayar, dan pencarian',
          'Format profesional untuk dokumentasi internal'
        ]
      }
    ],
    primaryCta: {
      label: 'Mulai Gratis',
      href: '/setup'
    },
    secondaryCta: {
      label: 'Lihat Update Fitur',
      href: '/updates'
    }
  },
  docs: {
    slug: 'docs',
    badge: 'Documentation',
    title: 'Dokumentasi ringkas untuk memulai, menjalankan, dan meninjau sistem',
    description:
      'Halaman ini merangkum alur utama penggunaan Aegis POS, mulai dari setup awal sampai cara menggunakan modul-modul inti dalam operasional harian.',
    highlights: [
      'Panduan setup bisnis dan user pertama',
      'Ringkasan alur produk, member, dan kasir',
      'Penjelasan report, settings, dan branding bisnis',
      'Rujukan praktis untuk onboarding tim internal'
    ],
    sections: [
      {
        title: '1. Setup awal bisnis',
        body:
          'Mulai dengan membuat bisnis, menambahkan user, mengisi identitas toko, dan menyiapkan informasi dasar seperti nama bisnis, logo opsional, dan PIC brand/toko.'
      },
      {
        title: '2. Kelola data operasional',
        body:
          'Tambahkan produk, atur kategori, masukkan data member, dan sesuaikan settings struk, pajak, serta service agar alur transaksi sesuai kebutuhan bisnis.'
      },
      {
        title: '3. Jalankan transaksi dan review hasil',
        body:
          'Kasir bisa melakukan checkout dari POS, memilih metode pembayaran, mengunggah bukti transaksi bila dibutuhkan, lalu owner meninjau order, dashboard, dan report.'
      }
    ],
    primaryCta: {
      label: 'Buka Setup',
      href: '/setup'
    },
    secondaryCta: {
      label: 'Tentang Sistem',
      href: '/about'
    }
  },
  blog: {
    slug: 'blog',
    badge: 'Insights',
    title: 'Wawasan operasional dan pengembangan produk Aegis POS',
    description:
      'Halaman blog ini disiapkan sebagai ruang untuk insight operasional, best practice penggunaan POS, dan pembahasan peningkatan sistem dari tim Aegis POS.',
    highlights: [
      'Insight operasional untuk retail, cafe, dan restoran',
      'Best practice dokumentasi pembayaran digital',
      'Catatan pengembangan produk dan kualitas sistem',
      'Akan terus dilengkapi seiring update berikutnya'
    ],
    sections: [
      {
        title: 'Konten yang sedang diprioritaskan',
        body:
          'Dalam fase awal, fokus utama kami adalah memastikan fitur inti dan update produk tetap jelas terdokumentasi. Karena itu, halaman update fitur masih menjadi sumber informasi paling aktif.'
      },
      {
        title: 'Arah konten berikutnya',
        body:
          'Ke depan, halaman ini akan menampilkan artikel tentang kontrol operasional kasir, strategi loyalty sederhana, penggunaan report untuk evaluasi harian, dan tata kelola pembayaran digital.'
      }
    ],
    primaryCta: {
      label: 'Buka Update Fitur',
      href: '/updates'
    },
    secondaryCta: {
      label: 'Lihat Fitur',
      href: '/features'
    }
  },
  contact: {
    slug: 'contact',
    badge: 'Contact',
    title: 'Hubungi tim kami untuk pertanyaan, kerja sama, atau diskusi implementasi',
    description:
      'Jika kamu ingin mendiskusikan penggunaan Aegis POS, alur operasional bisnis, atau kemungkinan kolaborasi, kami siapkan beberapa jalur kontak yang mudah dijangkau.',
    highlights: [
      'Pertanyaan seputar penggunaan sistem',
      'Diskusi branding, rollout, dan operasional bisnis',
      'Koordinasi partnership dengan SocialBrand1980',
      'Ruang untuk follow-up update fitur dan pengembangan'
    ],
    sections: [
      {
        title: 'Email utama',
        body:
          'Untuk komunikasi formal atau pengiriman kebutuhan bisnis secara tertulis, gunakan email hello@aegispos.com. Jalur ini cocok untuk diskusi implementasi, kerja sama, dan kebutuhan informasi lanjutan.'
      },
      {
        title: 'Update produk',
        body:
          'Jika tujuanmu adalah mengetahui perkembangan produk terbaru, halaman update fitur adalah rujukan paling cepat karena mencatat release dan penyempurnaan sistem yang sudah dipublikasikan.'
      }
    ],
    primaryCta: {
      label: 'Kirim Email',
      href: 'mailto:hello@aegispos.com'
    },
    secondaryCta: {
      label: 'Lihat Update Fitur',
      href: '/updates'
    }
  },
  privacy: {
    slug: 'privacy',
    badge: 'Privacy',
    title: 'Kebijakan privasi untuk penggunaan Aegis POS',
    description:
      'Halaman ini menjelaskan secara ringkas pendekatan Aegis POS terhadap data bisnis, data operasional, dan informasi pengguna yang tersimpan dalam sistem.',
    highlights: [
      'Data bisnis digunakan untuk mendukung operasional tenant masing-masing',
      'Akses internal dibatasi berdasarkan konteks bisnis dan hak admin',
      'Bukti pembayaran dan metadata transaksi hanya dipakai untuk kebutuhan dokumentasi',
      'Kami terus memperketat boundary data dan kontrol akses'
    ],
    sections: [
      {
        title: 'Data yang dikelola',
        body:
          'Aegis POS memproses data bisnis seperti produk, transaksi, member, metode pembayaran, serta pengaturan bisnis yang diperlukan untuk menjalankan sistem secara normal.'
      },
      {
        title: 'Prinsip akses data',
        body:
          'Data tenant dipisahkan berdasarkan bisnis masing-masing. Endpoint privat dirancang agar akses dibatasi ke user yang terautentikasi dan memiliki konteks bisnis yang sesuai.'
      },
      {
        title: 'Media dan bukti pembayaran',
        body:
          'Jika bisnis memilih mengunggah bukti pembayaran, file hanya dipakai sebagai referensi dokumentasi transaksi dan tidak diwajibkan untuk semua checkout.'
      }
    ],
    primaryCta: {
      label: 'Lihat Terms',
      href: '/terms'
    },
    secondaryCta: {
      label: 'Hubungi Kami',
      href: '/contact'
    }
  },
  terms: {
    slug: 'terms',
    badge: 'Terms',
    title: 'Ketentuan penggunaan Aegis POS',
    description:
      'Ketentuan ini memberi gambaran umum mengenai penggunaan sistem, tanggung jawab pengguna, dan batasan yang wajar dalam operasional harian platform.',
    highlights: [
      'Pengguna bertanggung jawab atas akurasi data bisnis yang dimasukkan',
      'Akses akun harus dijaga oleh masing-masing bisnis',
      'Perubahan fitur dan pembaruan sistem diumumkan melalui halaman update',
      'Penggunaan sistem harus sesuai dengan kebutuhan operasional yang sah'
    ],
    sections: [
      {
        title: 'Akun dan akses',
        body:
          'Setiap bisnis bertanggung jawab menjaga keamanan akun, perangkat, dan akses user internal yang digunakan untuk mengoperasikan sistem.'
      },
      {
        title: 'Kebenaran data',
        body:
          'Bisnis bertanggung jawab terhadap data transaksi, data produk, dan informasi member yang dimasukkan ke dalam sistem sebagai bagian dari proses operasional mereka sendiri.'
      },
      {
        title: 'Pembaruan produk',
        body:
          'Aegis POS dapat memperbarui fitur, alur kerja, maupun tampilan sistem untuk meningkatkan kualitas produk. Pengumuman perubahan penting akan dipublikasikan melalui halaman update fitur.'
      }
    ],
    primaryCta: {
      label: 'Buka About',
      href: '/about'
    },
    secondaryCta: {
      label: 'Update Fitur',
      href: '/updates'
    }
  },
  'pos-untuk-cafe': {
    slug: 'pos-untuk-cafe',
    badge: 'Cafe Use Case',
    title: 'POS untuk cafe yang butuh checkout cepat dan laporan yang rapi',
    description:
      'Cocok untuk cafe yang memerlukan proses kasir cepat, kontrol menu, transaksi digital, dan dokumentasi penjualan yang lebih tertib untuk operasional harian.',
    highlights: [
      'Kasir cepat untuk jam sibuk',
      'Pencarian menu dan kategori lebih mudah',
      'QRIS dan bukti pembayaran digital siap dicatat',
      'Report untuk evaluasi omzet harian'
    ],
    sections: [
      {
        title: 'Alur yang cocok untuk cafe',
        body:
          'Cafe biasanya butuh transaksi cepat dengan jumlah item berulang. Aegis POS membantu kasir memilih menu, menyelesaikan pembayaran, dan mencetak struk tanpa alur yang berbelit.'
      },
      {
        title: 'Kontrol pembayaran digital',
        body:
          'Karena pembayaran QRIS sangat umum di cafe, detail provider dan bukti pembayaran opsional membantu dokumentasi tetap rapi saat diperlukan.'
      }
    ],
    primaryCta: {
      label: 'Mulai untuk Cafe',
      href: '/setup'
    },
    secondaryCta: {
      label: 'Lihat Fitur',
      href: '/features'
    }
  },
  'pos-untuk-retail': {
    slug: 'pos-untuk-retail',
    badge: 'Retail Use Case',
    title: 'POS untuk retail dengan kontrol produk, member, dan laporan yang lebih siap',
    description:
      'Untuk retail, kerapian produk, stok, transaksi, dan loyalitas pelanggan sangat penting. Aegis POS membantu semuanya bergerak dalam satu sistem.',
    highlights: [
      'Manajemen produk dan stok',
      'Member dan loyalty points',
      'Riwayat order lengkap',
      'Dashboard performa produk dan penjualan'
    ],
    sections: [
      {
        id: 'inventory',
        title: 'Fokus pada data produk',
        body:
          'Bisnis retail umumnya memiliki banyak SKU dan kategori. Aegis POS membantu pengelolaan produk sekaligus menampilkan data penjualan yang mudah ditinjau.'
      },
      {
        id: 'loyalty',
        title: 'Retensi pelanggan lebih mudah',
        body:
          'Dengan fitur member dan points, retail dapat membangun hubungan pelanggan yang lebih konsisten tanpa tool terpisah.'
      }
    ],
    primaryCta: {
      label: 'Mulai untuk Retail',
      href: '/setup'
    },
    secondaryCta: {
      label: 'Tentang Sistem',
      href: '/about'
    }
  },
  'pos-untuk-restoran': {
    slug: 'pos-untuk-restoran',
    badge: 'Restaurant Use Case',
    title: 'POS untuk restoran yang mengutamakan kecepatan transaksi dan kontrol pembayaran',
    description:
      'Restoran butuh sistem kasir yang cepat, mudah dipahami tim, dan tetap menghasilkan dokumentasi transaksi yang kuat untuk evaluasi operasional.',
    highlights: [
      'Checkout lebih ringkas untuk volume transaksi tinggi',
      'Pembayaran cash, debit, QRIS, dan transfer',
      'Laporan penjualan profesional',
      'Struk thermal dengan branding bisnis'
    ],
    sections: [
      {
        title: 'Cocok untuk ritme operasional restoran',
        body:
          'Dalam jam ramai, tim membutuhkan alur checkout yang stabil dan mudah dibaca. Aegis POS membantu mengurangi gesekan operasional di meja kasir.'
      },
      {
        title: 'Review harian yang lebih tertata',
        body:
          'Dashboard dan report membantu owner restoran meninjau omzet, transaksi, dan dokumentasi pembayaran tanpa perlu merapikan data secara manual lagi.'
      }
    ],
    primaryCta: {
      label: 'Mulai untuk Restoran',
      href: '/setup'
    },
    secondaryCta: {
      label: 'Buka Report Updates',
      href: '/updates'
    }
  },
  'pos-indonesia': {
    slug: 'pos-indonesia',
    badge: 'Indonesia Market',
    title: 'Sistem POS Indonesia untuk bisnis yang ingin bergerak cepat dan rapi',
    description:
      'Dirancang untuk konteks bisnis Indonesia dengan kebutuhan transaksi cepat, pembayaran QRIS, thermal receipt, dan pelaporan yang mudah dipahami owner.',
    highlights: [
      'Mendukung pola pembayaran yang umum di Indonesia',
      'Poin loyalitas sederhana untuk UMKM',
      'Thermal receipt 58mm dan 80mm',
      'Cocok untuk bisnis retail, cafe, dan restoran'
    ],
    sections: [
      {
        title: 'Dibangun untuk kebutuhan operasional lokal',
        body:
          'Aegis POS memprioritaskan alur yang dekat dengan realitas bisnis Indonesia: kasir cepat, pembayaran digital umum, dan dokumentasi transaksi yang mudah ditinjau.'
      },
      {
        title: 'Lebih ringan diimplementasikan',
        body:
          'Setup sederhana membantu bisnis memulai lebih cepat tanpa proses onboarding yang rumit.'
      }
    ],
    primaryCta: {
      label: 'Coba Aegis POS',
      href: '/setup'
    },
    secondaryCta: {
      label: 'Lihat Pricing',
      href: '/pricing'
    }
  },
  'cloud-pos-system': {
    slug: 'cloud-pos-system',
    badge: 'Cloud POS',
    title: 'Cloud POS system untuk operasional yang lebih fleksibel dan mudah dipantau',
    description:
      'Sebagai sistem berbasis web, Aegis POS memungkinkan bisnis menjalankan kasir, melihat dashboard, dan mengakses report tanpa instalasi yang berat.',
    highlights: [
      'Akses berbasis web',
      'Update fitur berkelanjutan',
      'Laporan dan branding bisnis dalam satu platform',
      'Siap dipakai dari kasir sampai owner'
    ],
    sections: [
      {
        title: 'Keuntungan pendekatan cloud',
        body:
          'Dengan pendekatan berbasis web, bisnis tidak perlu bergantung pada instalasi lokal yang kompleks untuk mulai beroperasi dan meninjau data.'
      },
      {
        title: 'Operasional dan insight di satu tempat',
        body:
          'Kasir, owner, dan admin bisnis bisa bekerja dalam satu sistem yang saling terhubung dari transaksi sampai evaluasi.'
      }
    ],
    primaryCta: {
      label: 'Mulai Gratis',
      href: '/setup'
    },
    secondaryCta: {
      label: 'Lihat Fitur',
      href: '/features'
    }
  }
}

export const marketingPageSlugs = Object.keys(marketingPages)

export function getMarketingPage(slug: string) {
  return marketingPages[slug]
}
