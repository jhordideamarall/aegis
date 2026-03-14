'use client'

import Link from 'next/link'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="landing-nav-offset-lg max-w-7xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">Pricing Sederhana, 100% Gratis</h1>
          <p className="text-xl text-gray-600">Semua fitur AEGIS POS gratis untuk semua. Tanpa hidden fees.</p>
        </div>
        <div className="max-w-lg mx-auto">
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-1 shadow-2xl">
            <div className="bg-white rounded-xl p-8">
              <div className="text-center mb-8">
                <div className="inline-block px-4 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full mb-4">FREE FOREVER</div>
                <h3 className="text-2xl font-bold mb-2">Rp 0 / bulan</h3>
                <p className="text-gray-500">selamanya, tanpa batas waktu</p>
              </div>
              <ul className="space-y-4 mb-8">
                {['Unlimited Products', 'Unlimited Orders', 'Member Management', 'Dashboard Analytics', 'Thermal Printer Support', 'Multi-user Access', 'Cloud Backup', 'Free Updates'].map((feature) => (
                  <li key={feature} className="flex items-center gap-3"><span className="text-green-500 text-xl">✓</span><span className="text-gray-700">{feature}</span></li>
                ))}
              </ul>
              <Link href="/setup" className="block w-full py-4 bg-blue-600 text-white font-bold text-center rounded-lg hover:bg-blue-700 transition-colors text-lg">🚀 Mulai Gratis Sekarang</Link>
              <p className="text-center text-sm text-gray-500 mt-4">✓ Tanpa kartu kredit  ✓ Setup dalam 2 menit</p>
            </div>
          </div>
        </div>
        <div className="max-w-3xl mx-auto mt-24 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Kenapa Gratis?</h2>
          <p className="text-lg text-gray-600 mb-8">Kami sedang membangun user base. Early users akan dapat special pricing untuk premium features nanti!</p>
        </div>
      </div>
      <Footer />
    </div>
  )
}
