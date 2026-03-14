'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'

export default function SetupWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    business_name: '', industry: 'general', email: '', phone: '', address: '', city: '',
    full_name: '', owner_email: '', password: '', confirm_password: '',
    receipt_header: '', receipt_footer: 'Terima Kasih!', paper_size: '58mm'
  })

  const updateFormData = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }))

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
          full_name: formData.full_name,
          email: formData.owner_email,
          password: formData.password
        })
      })
      const userData = await userRes.json()
      if (!userRes.ok) throw new Error(userData.error || 'User creation failed')
      // Step 4: Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.owner_email,
        password: formData.password
      })
      if (signInError) throw new Error(signInError.message || 'Failed to sign in')
      // Step 5: Complete setup with settings
      const completeRes = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: bizData.business_id,
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
      // Step 6: Redirect to dashboard
      router.push('/dashboard')
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
    </div>
  )
}
