'use client'
import { useState } from 'react'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import Modal from '@/components/Modal'
import { getSiteUrl } from '@/lib/site'
import { buildBusinessAppUrl } from '@/lib/tenant'

interface SetupSummary {
  businessName: string
  tenantUrl: string
  loginEmail: string
  loginPassword: string
}

export default function SetupWizard() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [setupSummary, setSetupSummary] = useState<SetupSummary | null>(null)
  const [formData, setFormData] = useState({
    business_name: '', industry: 'general', email: '', phone: '', pic_name: '', address: '', city: '',
    full_name: '', owner_email: '', password: '', confirm_password: '',
    receipt_header: '', receipt_footer: 'Terima Kasih!', paper_size: '58mm'
  })

  const updateFormData = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }))

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch (error) {
      console.error('Failed to copy setup value:', error)
    }
  }

  const handleGoToLogin = () => {
    if (!setupSummary) return

    const loginUrl = new URL('/login', getSiteUrl())
    loginUrl.searchParams.set('email', setupSummary.loginEmail)
    window.location.assign(loginUrl.toString())
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      // Step 1: Validate passwords match
      if (formData.password !== formData.confirm_password) {
        throw new Error('Passwords do not match')
      }

      // Step 2: Create business
      const bizRes = await fetch('/api/setup/create-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: formData.business_name,
          industry: formData.industry,
          email: formData.email,
          phone: formData.phone,
          pic_name: formData.pic_name,
          address: formData.address,
          city: formData.city
        })
      })
      const bizData = await bizRes.json()
      if (!bizRes.ok) throw new Error(bizData.error || 'Failed to create business')
      // Step 3: Create user
      const userRes = await fetch('/api/setup/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: bizData.business_id,
          setup_token: bizData.setup_token,
          full_name: formData.full_name,
          email: formData.owner_email,
          password: formData.password
        })
      })
      const userData = await userRes.json()
      if (!userRes.ok) throw new Error(userData.error || 'User creation failed')

      // Step 4: Complete setup with settings
      const completeRes = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: bizData.business_id,
          setup_token: bizData.setup_token,
          settings: {
            receipt_header: formData.receipt_header || formData.business_name,
            receipt_footer: formData.receipt_footer,
            paper_size: formData.paper_size
          }
        })
      })
      if (!completeRes.ok) {
        const completeData = await completeRes.json()
        throw new Error(completeData.error || 'Setup failed')
      }

      // Step 5: Show account summary before redirecting to login.
      setSetupSummary({
        businessName: formData.business_name,
        tenantUrl: buildBusinessAppUrl(bizData.subdomain, '/dashboard', window.location.origin),
        loginEmail: formData.owner_email,
        loginPassword: formData.password
      })
    } catch (err: any) {
      console.error('Setup error:', err)
      setError(err.message || 'Setup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="landing-nav-offset-lg max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="flex justify-between mb-2"><span className="text-sm font-medium">Step {step} of 3</span><span className="text-sm text-gray-500">{Math.round((step/3)*100)}%</span></div>
          <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${(step/3)*100}%` }}></div></div>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Business Information</h2>
              <p className="text-gray-600 mb-6">Tell us about your business</p>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium mb-2">Business Name *</label><input type="text" value={formData.business_name} onChange={(e) => updateFormData('business_name', e.target.value)} className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Kopi Kenangan" required /></div>
                <div><label className="block text-sm font-medium mb-2">Industry *</label><select value={formData.industry} onChange={(e) => updateFormData('industry', e.target.value)} className="w-full px-4 py-3 border rounded-lg"><option value="general">General</option><option value="fnb">Food & Beverage</option><option value="retail">Retail</option><option value="services">Services</option></select></div>
                <div><label className="block text-sm font-medium mb-2">Email *</label><input type="email" value={formData.email} onChange={(e) => updateFormData('email', e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="business@example.com" required /></div>
                <div><label className="block text-sm font-medium mb-2">Phone</label><input type="tel" value={formData.phone} onChange={(e) => updateFormData('phone', e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="0812-3456-7890" /></div>
                <div><label className="block text-sm font-medium mb-2">PIC Brand/Toko</label><input type="text" value={formData.pic_name} onChange={(e) => updateFormData('pic_name', e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="e.g., Budi Santoso" /></div>
                <div><label className="block text-sm font-medium mb-2">Address</label><textarea value={formData.address} onChange={(e) => updateFormData('address', e.target.value)} rows={2} className="w-full px-4 py-3 border rounded-lg" placeholder="Street address" /></div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Owner Account</h2>
              <p className="text-gray-600 mb-6">Create your login account</p>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium mb-2">Full Name *</label><input type="text" value={formData.full_name} onChange={(e) => updateFormData('full_name', e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="Ahmad Rizki" required /></div>
                <div><label className="block text-sm font-medium mb-2">Email (for login) *</label><input type="email" value={formData.owner_email} onChange={(e) => updateFormData('owner_email', e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="you@example.com" required /></div>
                <div><label className="block text-sm font-medium mb-2">Password *</label><input type="password" value={formData.password} onChange={(e) => updateFormData('password', e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="Min. 6 characters" minLength={6} required /></div>
                <div><label className="block text-sm font-medium mb-2">Confirm Password *</label><input type="password" value={formData.confirm_password} onChange={(e) => updateFormData('confirm_password', e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="Re-enter password" minLength={6} required /></div>
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Store Settings</h2>
              <p className="text-gray-600 mb-6">Customize your receipt</p>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium mb-2">Receipt Header</label><input type="text" value={formData.receipt_header} onChange={(e) => updateFormData('receipt_header', e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder={formData.business_name || 'Your business name'} /></div>
                <div><label className="block text-sm font-medium mb-2">Receipt Footer</label><textarea value={formData.receipt_footer} onChange={(e) => updateFormData('receipt_footer', e.target.value)} rows={3} className="w-full px-4 py-3 border rounded-lg" placeholder="Thank you message" /></div>
                <div><label className="block text-sm font-medium mb-2">Paper Size</label><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => updateFormData('paper_size', '58mm')} className={`py-3 px-4 rounded-lg border-2 font-medium ${formData.paper_size === '58mm' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200'}`}>58mm</button><button type="button" onClick={() => updateFormData('paper_size', '80mm')} className={`py-3 px-4 rounded-lg border-2 font-medium ${formData.paper_size === '80mm' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200'}`}>80mm</button></div></div>
              </div>
            </div>
          )}
          <div className="flex gap-4 mt-8 pt-6 border-t">
            {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="flex-1 py-3 border rounded-lg hover:bg-gray-50">Back</button>}
            {step < 3 ? (
              <button type="button" onClick={() => setStep(step + 1)} className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Continue</button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">{loading ? 'Creating...' : '🎉 Create My POS'}</button>
            )}
          </div>
        </div>
      </div>
      <Footer />

      <Modal
        isOpen={Boolean(setupSummary)}
        onClose={handleGoToLogin}
        title="Akun Tenant Berhasil Dibuat"
        size="lg"
      >
        {setupSummary && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="text-lg font-semibold text-emerald-900">
                {setupSummary.businessName} siap digunakan
              </h3>
              <p className="mt-2 text-sm text-emerald-800">
                Simpan data berikut sebelum lanjut. Setelah kamu klik tombol OK, sistem akan
                mengarahkan ke halaman login utama.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="mb-2 text-sm font-medium text-gray-700">URL Tenant</div>
                <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-900 break-all">
                  {setupSummary.tenantUrl}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(setupSummary.tenantUrl)}
                  className="mt-3 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Copy URL
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="mb-2 text-sm font-medium text-gray-700">Email Login</div>
                <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-900 break-all">
                  {setupSummary.loginEmail}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(setupSummary.loginEmail)}
                  className="mt-3 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Copy Email
                </button>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="mb-2 text-sm font-medium text-amber-900">Password Login</div>
                <div className="rounded-lg bg-white/80 p-3 text-sm font-medium text-amber-950 break-all">
                  {setupSummary.loginPassword}
                </div>
                <p className="mt-2 text-xs text-amber-800">
                  Simpan password ini sekarang. Informasi ini tidak akan ditampilkan ulang setelah kamu lanjut.
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(setupSummary.loginPassword)}
                  className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
                >
                  Copy Password
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleGoToLogin}
                className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
              >
                OK, Lanjut ke Login
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
