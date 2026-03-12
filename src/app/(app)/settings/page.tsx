'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getClientCache, setClientCache } from '@/lib/clientCache'

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
  const { business, loading } = useAuth()
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

  useEffect(() => {
    if (!loading && business) {
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

      const res = await fetch(`/api/settings?business_id=${business.id}`)
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
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error: any) {
      alert(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
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
