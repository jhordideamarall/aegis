import Link from 'next/link'
import { ArrowLeft, Calendar, CheckCircle } from 'react-feather'
import { notFound } from 'next/navigation'
import Footer from '@/components/landing/Footer'
import Navbar from '@/components/landing/Navbar'
import {
  formatFeatureUpdateDate,
  isFeatureUpdatesTableMissing,
  normalizeFeatureUpdate,
  splitContentIntoParagraphs
} from '@/lib/featureUpdates'
import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 60

async function getFeatureUpdate(slug: string) {
  const { data, error } = await supabaseAdmin
    .from('feature_updates')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) {
    if (!isFeatureUpdatesTableMissing(error)) {
      console.error('Error loading feature update detail:', error)
    }
    return null
  }

  return data ? normalizeFeatureUpdate(data) : null
}

export default async function FeatureUpdateDetailPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const update = await getFeatureUpdate(slug)

  if (!update) {
    notFound()
  }

  const paragraphs = splitContentIntoParagraphs(update.content)

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900 overflow-x-hidden">
      <Navbar />

      <section className="landing-nav-offset">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <Link
            href="/updates"
            className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 transition hover:text-sky-800"
          >
            <ArrowLeft size={15} />
            Kembali ke Update Fitur
          </Link>

          <article className="mt-8 rounded-[34px] border border-slate-200 bg-white px-6 py-8 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)] sm:px-10 sm:py-10">
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

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
              {update.title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">{update.summary}</p>

            {update.highlights.length > 0 && (
              <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-lg font-semibold text-slate-950">Highlight Pembaruan</h2>
                <ul className="mt-4 space-y-3">
                  {update.highlights.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-7 text-slate-700">
                      <CheckCircle size={17} className="mt-1 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-10 space-y-6">
              {paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-base leading-8 text-slate-700">
                  {paragraph}
                </p>
              ))}
            </div>
          </article>
        </div>
      </section>

      <Footer />
    </div>
  )
}
