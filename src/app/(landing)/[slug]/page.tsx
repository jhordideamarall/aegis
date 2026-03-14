import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, CheckCircle, FileText, Shield } from 'react-feather'
import Footer from '@/components/landing/Footer'
import Navbar from '@/components/landing/Navbar'
import { getMarketingPage, marketingPageSlugs } from '@/lib/marketingPages'
import { getSiteUrl } from '@/lib/site'

export function generateStaticParams() {
  return marketingPageSlugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const page = getMarketingPage(slug)

  if (!page) {
    return {}
  }

  const siteUrl = getSiteUrl()
  const canonicalUrl = `${siteUrl}/${page.slug}`

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: canonicalUrl
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url: canonicalUrl
    }
  }
}

export default async function MarketingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = getMarketingPage(slug)

  if (!page) {
    notFound()
  }

  const siteUrl = getSiteUrl()
  const canonicalUrl = `${siteUrl}/${page.slug}`

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f7fb] text-slate-900">
      <Navbar />

      <section className="landing-nav-offset relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.12),_transparent_36%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 md:py-28">
          <div className="grid gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-sm font-semibold text-sky-800 shadow-sm">
                <Shield size={14} />
                {page.badge}
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl md:text-6xl">
                {page.title}
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
                {page.description}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={page.primaryCta.href}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  {page.primaryCta.label}
                  <ArrowRight size={16} />
                </Link>
                {page.secondaryCta && (
                  <Link
                    href={page.secondaryCta.href}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {page.secondaryCta.label}
                  </Link>
                )}
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Highlights</p>
              <div className="mt-5 grid gap-4">
                {page.highlights.map((item) => (
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
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.28)]">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <FileText size={20} />
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">
                Ringkasan halaman
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Halaman ini merupakan bagian dari ekosistem publik Aegis POS untuk membantu calon pengguna,
                partner, dan tim internal memahami positioning produk, use case, serta arah implementasi sistem.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Canonical URL:
                {' '}
                <span className="font-medium text-slate-800">{canonicalUrl}</span>
              </p>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-slate-950 p-7 text-white shadow-[0_24px_70px_-45px_rgba(15,23,42,0.5)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">CTA</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                Siap lanjut ke langkah berikutnya?
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Gunakan halaman ini sebagai gerbang ke setup, update fitur, atau materi penjelasan produk yang paling relevan dengan kebutuhan bisnis.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={page.primaryCta.href}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  {page.primaryCta.label}
                  <ArrowRight size={15} />
                </Link>
                {page.secondaryCta && (
                  <Link
                    href={page.secondaryCta.href}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    {page.secondaryCta.label}
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {page.sections.map((section) => (
              <article
                key={section.title}
                id={section.id}
                className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.28)]"
              >
                <h3 className="text-xl font-semibold text-slate-950">{section.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">{section.body}</p>
                {section.points && section.points.length > 0 && (
                  <ul className="mt-5 space-y-3">
                    {section.points.map((point) => (
                      <li key={point} className="flex gap-3 text-sm leading-7 text-slate-700">
                        <CheckCircle size={17} className="mt-1 shrink-0 text-emerald-600" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
