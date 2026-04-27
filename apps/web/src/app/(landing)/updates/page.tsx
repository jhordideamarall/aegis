import Link from 'next/link'
import { ArrowRight, Bell, Calendar, CheckCircle, Zap } from 'react-feather'
import Footer from '@/components/landing/Footer'
import Navbar from '@/components/landing/Navbar'
import { formatFeatureUpdateDate, isFeatureUpdatesTableMissing, normalizeFeatureUpdate } from '@/lib/featureUpdates'
import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 60

async function getPublishedUpdates() {
  const { data, error } = await supabaseAdmin
    .from('feature_updates')
    .select('*')
    .eq('status', 'published')
    .order('featured', { ascending: false })
    .order('published_at', { ascending: false })

  if (error) {
    if (!isFeatureUpdatesTableMissing(error)) {
      console.error('Error loading published updates:', error)
    }
    return []
  }

  return (data || []).map(normalizeFeatureUpdate)
}

export default async function UpdatesPage() {
  const updates = await getPublishedUpdates()
  const featuredUpdate = updates[0]

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900 overflow-x-hidden">
      <Navbar />

      <section className="landing-nav-offset relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.12),_transparent_35%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-sm font-semibold text-sky-800 shadow-sm">
              <Bell size={14} />
              Update Fitur Aegis POS
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl md:text-6xl">
              Catatan rilis, pembaruan sistem, dan peningkatan terbaru
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
              Halaman ini berisi pengumuman resmi fitur baru, penyempurnaan alur kerja, dan pembaruan penting yang
              memengaruhi penggunaan Aegis POS sehari-hari.
            </p>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {featuredUpdate && (
            <div className="mb-10 rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_28px_80px_-45px_rgba(15,23,42,0.35)]">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                    <Zap size={12} />
                    {featuredUpdate.featured ? 'Featured Release' : 'Latest Release'}
                  </div>
                  <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                    {featuredUpdate.title}
                  </h2>
                  <p className="mt-4 text-base leading-8 text-slate-600">{featuredUpdate.summary}</p>
                </div>
                <div className="rounded-3xl bg-slate-950 px-5 py-4 text-white">
                  <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Released</p>
                  <p className="mt-2 text-lg font-semibold">
                    {formatFeatureUpdateDate(featuredUpdate.published_at)}
                  </p>
                  {featuredUpdate.version && (
                    <p className="mt-1 text-sm text-slate-300">{featuredUpdate.version}</p>
                  )}
                </div>
              </div>
              {featuredUpdate.highlights.length > 0 && (
                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {featuredUpdate.highlights.slice(0, 6).map((item) => (
                    <div key={item} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
                      <CheckCircle size={18} className="mt-1 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-8">
                <Link
                  href={`/updates/${featuredUpdate.slug}`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Baca Detail Update
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {updates.length > 0 ? updates.map((update) => (
              <article
                key={update.id}
                className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.28)]"
              >
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                    <Calendar size={14} />
                    {formatFeatureUpdateDate(update.published_at)}
                  </span>
                  {update.version && (
                    <span className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-700">
                      {update.version}
                    </span>
                  )}
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">{update.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">{update.summary}</p>
                {update.highlights.length > 0 && (
                  <ul className="mt-5 space-y-3">
                    {update.highlights.slice(0, 3).map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-7 text-slate-700">
                        <CheckCircle size={17} className="mt-1 shrink-0 text-emerald-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-6">
                  <Link
                    href={`/updates/${update.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 transition hover:text-sky-800"
                  >
                    Buka update
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            )) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-600 lg:col-span-2">
                Belum ada pengumuman update fitur yang dipublikasikan.
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
