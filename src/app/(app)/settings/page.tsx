'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getClientCache, setClientCache } from '@/lib/clientCache'
import { getClientAccessToken, getClientAuthHeaders } from '@/lib/clientAuth'
import { supabase } from '@/lib/supabase'
import { getBusinessDisplayName, getBusinessInitials } from '@/lib/businessBranding'

interface Settings {
  receipt_header: string
  receipt_footer: string
  paper_size: '58mm' | '80mm'
  tax_enabled: boolean
  tax_rate: number
  service_enabled: boolean
  service_rate: number
}

export default function SettingsPage() {
  const { business, loading, refresh } = useAuth()
  const [settings, setSettings] = useState<Settings>({
    receipt_header: '',
    receipt_footer: 'Terima Kasih!',
    paper_size: '58mm',
    tax_enabled: false,
    tax_rate: 0,
    service_enabled: false,
    service_rate: 0
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [picName, setPicName] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoRemoving, setLogoRemoving] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordNotice, setPasswordNotice] = useState('')

  useEffect(() => {
    if (!loading && business) {
      setPicName(business.pic_name || '')
      fetchSettings()
    }
  }, [loading, business])

  const fetchSettings = async () => {
    if (!business) return
    try {
      const cacheKey = `settings:${business.id}`
      const cached = getClientCache<Settings>(cacheKey)
      if (cached) {
        setSettings(cached)
      }

      const res = await fetch(`/api/settings?business_id=${business.id}`, {
        headers: await getClientAuthHeaders()
      })
      if (res.ok) {
        const data = await res.json()
        const nextSettings: Settings = {
          receipt_header: data.receipt_header || business.business_name,
          receipt_footer: data.receipt_footer || 'Terima Kasih!',
          paper_size: data.receipt_paper_size || '58mm',
          tax_enabled: data.tax_enabled === true || data.tax_enabled === 'true',
          tax_rate: Number(data.tax_rate) || 0,
          service_enabled: data.service_enabled === true || data.service_enabled === 'true',
          service_rate: Number(data.service_rate) || 0
        }
        setSettings(nextSettings)
        setClientCache(cacheKey, nextSettings)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const handleSave = async () => {
    if (!business) return
    setSaving(true)
    setSaved(false)

    try {
      const token = await getClientAccessToken()

      if (!token) {
        throw new Error('Session expired. Please login again.')
      }

      const businessRes = await fetch('/api/businesses/my', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          pic_name: picName
        })
      })

      if (!businessRes.ok) {
        const businessError = await businessRes.json()
        throw new Error(businessError.error || 'Failed to save business profile')
      }

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: await getClientAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          business_id: business.id,
          settings: {
            receipt_header: settings.receipt_header,
            receipt_footer: settings.receipt_footer,
            receipt_paper_size: settings.paper_size,
            tax_enabled: settings.tax_enabled ? 'true' : 'false',
            tax_rate: String(settings.tax_rate || 0),
            service_enabled: settings.service_enabled ? 'true' : 'false',
            service_rate: String(settings.service_rate || 0)
          }
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save settings')
      }

      await refresh()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error: any) {
      alert(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (file: File | null) => {
    if (!business || !file) return

    setLogoUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('Session expired. Please login again.')
      }

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/businesses/my/logo', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to upload logo')
      }

      await refresh()
    } catch (error: any) {
      alert(error.message || 'Failed to upload logo')
    } finally {
      setLogoUploading(false)
    }
  }

  const handleLogoRemove = async () => {
    if (!business) return

    setLogoRemoving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('Session expired. Please login again.')
      }

      const res = await fetch('/api/businesses/my/logo', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to remove logo')
      }

      await refresh()
    } catch (error: any) {
      alert(error.message || 'Failed to remove logo')
    } finally {
      setLogoRemoving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordSaving(true)
    setPasswordNotice('')

    try {
      if (passwordForm.newPassword.length < 6) {
        throw new Error('Password baru minimal 6 karakter.')
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error('Konfirmasi password tidak cocok.')
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (error) throw error

      setPasswordForm({
        newPassword: '',
        confirmPassword: ''
      })
      setPasswordNotice('Password berhasil diperbarui.')
    } catch (error: any) {
      setPasswordNotice(error.message || 'Gagal memperbarui password.')
    } finally {
      setPasswordSaving(false)
    }
  }

  const previewSubtotal = 25000
  const previewDiscount = 0
  const previewBase = Math.max(previewSubtotal - previewDiscount, 0)
  const previewTax = settings.tax_enabled ? Math.round((previewBase * settings.tax_rate) / 100) : 0
  const previewService = settings.service_enabled ? Math.round((previewBase * settings.service_rate) / 100) : 0
  const previewTotal = previewBase + previewTax + previewService

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Settings</h1>
          <p className="text-gray-500">Customize your POS system</p>
        </div>

        {/* Business Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Business Information</h2>
          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                {business?.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={business.business_name}
                    className="h-20 w-20 rounded-2xl object-cover border border-gray-200 bg-white"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-gray-900 text-white flex items-center justify-center text-2xl font-semibold">
                    {getBusinessInitials(business?.business_name)}
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">Brand Preview</p>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {getBusinessDisplayName(business?.business_name)}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Jika logo belum diupload, sistem otomatis menampilkan nama bisnis.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 md:ml-auto">
                <label className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium cursor-pointer hover:bg-gray-800">
                  {logoUploading ? 'Uploading...' : 'Upload Logo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={logoUploading || logoRemoving}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      void handleLogoUpload(file)
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
                {business?.logo_url && (
                  <button
                    type="button"
                    onClick={handleLogoRemove}
                    disabled={logoUploading || logoRemoving}
                    className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-50"
                  >
                    {logoRemoving ? 'Removing...' : 'Remove Logo'}
                  </button>
                )}
                <p className="text-xs text-gray-500">Opsional. Format gambar umum, maksimal 3 MB.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
              <input
                type="text"
                value={business?.business_name || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="text"
                value={business?.email || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="text"
                value={business?.phone || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PIC Brand/Toko</label>
              <input
                type="text"
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Budi Santoso"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
              <input
                type="text"
                value={business?.industry || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 capitalize"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            To update business information, please contact support.
          </p>
        </div>

        {/* Receipt Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Receipt Settings</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Header</label>
              <input
                type="text"
                value={settings.receipt_header}
                onChange={(e) => setSettings({ ...settings, receipt_header: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your business name"
              />
              <p className="text-sm text-gray-500 mt-1">
                This will appear at the top of every receipt
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Footer</label>
              <textarea
                value={settings.receipt_footer}
                onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Thank you message"
              />
              <p className="text-sm text-gray-500 mt-1">
                Use {'\\n'} for line breaks. Example: Terima Kasih!{'\\n'}Barang yang sudah dibeli tidak dapat ditukar
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Paper Size</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, paper_size: '58mm' })}
                  className={`p-4 rounded-lg border-2 font-medium transition-all ${
                    settings.paper_size === '58mm'
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">🧾</div>
                  <div className="font-semibold">58mm</div>
                  <div className="text-sm text-gray-500">Standard thermal printer</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, paper_size: '80mm' })}
                  className={`p-4 rounded-lg border-2 font-medium transition-all ${
                    settings.paper_size === '80mm'
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">📄</div>
                  <div className="font-semibold">80mm</div>
                  <div className="text-sm text-gray-500">Wide thermal printer</div>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tax & Service</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={settings.tax_enabled}
                      onChange={(e) => setSettings({ ...settings, tax_enabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    Tax (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={settings.tax_rate}
                    onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) || 0 })}
                    disabled={!settings.tax_enabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                    placeholder="e.g., 10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={settings.service_enabled}
                      onChange={(e) => setSettings({ ...settings, service_enabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    Service (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={settings.service_rate}
                    onChange={(e) => setSettings({ ...settings, service_rate: parseFloat(e.target.value) || 0 })}
                    disabled={!settings.service_enabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                    placeholder="e.g., 5"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Preview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Receipt Preview</h2>
          <div className="flex justify-center overflow-x-auto">
            <div
              className={`bg-white border border-gray-300 shadow-sm ${
                settings.paper_size === '58mm' ? 'w-[58mm]' : 'w-[80mm]'
              }`}
              style={{
                padding: '8px',
                fontFamily: 'monospace',
                fontSize: settings.paper_size === '58mm' ? '10px' : '12px',
                minHeight: '200px'
              }}
            >
              <div className="text-center mb-2 font-bold">
                {settings.receipt_header}
              </div>
              <div className="border-t border-dashed border-gray-400 my-2"></div>
              <div className="flex justify-between text-xs">
                <span>Order #: 123456</span>
                <span>12/03/2026 10:30</span>
              </div>
              <div className="border-t border-dashed border-gray-400 my-2"></div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Kopi Latte</span>
                  <span>25.000</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>1 x 25.000</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-400 my-2"></div>

              <div className="flex justify-between text-xs">
                <span>Subtotal</span>
                <span>{previewSubtotal.toLocaleString('id-ID')}</span>
              </div>

              {settings.tax_enabled && (
                <div className="flex justify-between text-xs">
                  <span>Tax ({settings.tax_rate}%)</span>
                  <span>{previewTax.toLocaleString('id-ID')}</span>
                </div>
              )}

              {settings.service_enabled && (
                <div className="flex justify-between text-xs">
                  <span>Service ({settings.service_rate}%)</span>
                  <span>{previewService.toLocaleString('id-ID')}</span>
                </div>
              )}

              <div className="border-t border-dashed border-gray-400 my-2"></div>

              <div
                className="flex justify-between font-bold"
                style={{ fontSize: settings.paper_size === '58mm' ? '10px' : '12px' }}
              >
                <span>TOTAL</span>
                <span>{previewTotal.toLocaleString('id-ID')}</span>
              </div>

              <div className="border-t border-dashed border-gray-400 my-2"></div>

              <div
                className="text-center"
                style={{ fontSize: settings.paper_size === '58mm' ? '8px' : '10px' }}
              >
                {settings.receipt_footer.split('\\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Password</h2>
          <p className="text-sm text-gray-500 mb-6">
            Ubah password akun yang sedang kamu gunakan untuk login ke Aegis POS.
          </p>

          <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Minimal 6 karakter"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ulangi password baru"
              />
            </div>
            <div className="md:col-span-2 flex flex-col gap-3">
              {passwordNotice && (
                <div className={`rounded-lg px-4 py-3 text-sm ${passwordNotice.includes('berhasil') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {passwordNotice}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium disabled:opacity-50"
                >
                  {passwordSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-4 flex-col md:flex-row">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full md:w-auto px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && (
            <span className="text-green-600 font-medium">✓ Settings saved successfully!</span>
          )}
        </div>
      </div>
    </div>
  )
}
