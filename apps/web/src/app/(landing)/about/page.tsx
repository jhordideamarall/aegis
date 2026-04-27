import Link from 'next/link'
import {
  ArrowRight,
  BarChart,
  CheckCircle,
  Clock,
  CreditCard,
  Layers,
  Package,
  Printer,
  Shield,
  Users,
  Zap
} from 'react-feather'
import Footer from '@/components/landing/Footer'
import Navbar from '@/components/landing/Navbar'

const pillars = [
  {
    title: 'Transaksi Cepat dan Stabil',
    description: 'Dirancang agar kasir bisa memproses checkout dengan cepat, rapi, dan minim hambatan di jam sibuk.',
    icon: Zap
  },
  {
    title: 'Kontrol Operasional Harian',
    description: 'Produk, stok, order, member, dan laporan bergerak dalam satu alur kerja yang saling terhubung.',
    icon: Layers
  },
  {
    title: 'Pelaporan yang Siap Dipakai',
    description: 'Laporan penjualan, payment breakdown, QRIS detail, dan bukti pembayaran bisa ditinjau dalam format profesional.',
    icon: BarChart
  }
]

const capabilities = [
  'Point of sale cepat untuk toko, retail, F&B, dan bisnis layanan',
  'Multi-metode pembayaran termasuk cash, debit, QRIS, dan bank transfer',
  'Upload bukti pembayaran opsional untuk transaksi digital',
  'Dashboard performa bisnis dengan insight penjualan dan produk terlaris',
  'Member management dan loyalty points',
  'Cetak struk thermal 58mm dan 80mm dengan branding bisnis',
  'Report penjualan profesional dengan lampiran bukti pembayaran',
  'Branding bisnis per tenant, termasuk nama bisnis, logo, dan detail PIC'
]

const operatingFlow = [
  {
    title: '1. Siapkan Bisnis',
    description: 'Owner mendaftarkan bisnis, mengisi identitas toko, dan menyiapkan branding serta pengaturan struk.'
  },
  {
    title: '2. Mulai Operasional',
    description: 'Tim kasir dapat menjalankan transaksi, memilih metode pembayaran, dan menyimpan order dengan rapi.'
  },
  {
    title: '3. Pantau Performa',
    description: 'Owner atau admin bisnis memantau omzet, transaksi, produk, member, dan kualitas dokumentasi pembayaran.'
  },
  {
    title: '4. Review dan Tindak Lanjut',
    description: 'Laporan dan pengumuman update fitur membantu bisnis tetap sinkron dengan perkembangan sistem.'
  }
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900 overflow-x-hidden">
      <Navbar />

      <section className="landing-nav-offset relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(30,78,130,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_30%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-sm font-semibold text-sky-800 shadow-sm">
                <Shield size={14} />
                Built for operational clarity
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl md:text-6xl">
                About Aegis POS
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
                Aegis POS adalah sistem point of sale modern yang membantu bisnis mengelola transaksi, pelanggan,
                inventori, laporan penjualan, dan dokumentasi pembayaran dalam satu alur kerja yang lebih tertib.
              </p>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                Fokus utamanya bukan sekadar kasir digital, tetapi platform operasional yang membantu bisnis bergerak
                lebih cepat, terlihat lebih profesional, dan punya catatan penjualan yang jauh lebih siap dipakai.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/setup"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Mulai Gratis
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/updates"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Lihat Update Fitur
                </Link>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)]">
              <div className="grid grid-cols-2 gap-4">
                <AboutStat icon={CreditCard} value="4+" label="Metode bayar utama" />
                <AboutStat icon={Package} value="Real-time" label="Kontrol produk & stok" />
                <AboutStat icon={Users} value="Loyalty-ready" label="Member & points" />
                <AboutStat icon={Printer} value="Professional" label="Thermal receipt flow" />
              </div>
              <div className="mt-6 rounded-3xl bg-slate-950 p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">Positioning</p>
                <p className="mt-3 text-lg font-semibold leading-8">
                  Sistem POS yang mengutamakan kecepatan kasir, kerapian data transaksi, dan kesiapan laporan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Core Pillars</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Dirancang untuk kebutuhan operasional bisnis yang nyata
            </h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {pillars.map((pillar) => {
              const Icon = pillar.icon
              return (
                <div
                  key={pillar.title}
                  className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.28)]"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-slate-950">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{pillar.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">What The System Covers</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                Komprehensif dari kasir sampai report
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                Aegis POS dibangun agar bisnis tidak perlu berpindah-pindah tool untuk kebutuhan operasional dasar.
                Data transaksi, metode pembayaran, pelanggan, produk, dan laporan semua bergerak dalam sistem yang sama.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {capabilities.map((item) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700"
                >
                  <CheckCircle size={18} className="mt-1 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">How It Works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Alur sistem yang mudah dipahami tim operasional
            </h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-4">
            {operatingFlow.map((step) => (
              <div
                key={step.title}
                className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.28)]"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Clock size={18} />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-950">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-950 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-200">Why Businesses Use It</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
            Bukan hanya untuk jualan, tapi untuk membuat operasional lebih tertata
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            Ketika bisnis berkembang, yang dibutuhkan bukan hanya checkout cepat, tapi juga dokumentasi transaksi yang
            rapi, tampilan brand yang profesional, dan laporan yang siap dipakai untuk evaluasi harian.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/setup"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              Coba Aegis POS
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/updates"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Jelajahi Update Fitur
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function AboutStat({
  icon: Icon,
  value,
  label
}: {
  icon: typeof CreditCard
  value: string
  label: string
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
        <Icon size={18} />
      </div>
      <div className="mt-4 text-lg font-bold text-slate-950">{value}</div>
      <div className="mt-1 text-sm text-slate-600">{label}</div>
    </div>
  )
}
