'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getClientAuthHeaders } from '@/lib/clientAuth'
import { supabase } from '@/lib/supabase'
import { 
  Building2, 
  Receipt, 
  Save, 
  Loader2, 
  Percent,
  Smartphone,
  Mail,
  MapPin,
  Printer
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { formatIDR } from '@/lib/utils'

export default function SettingsPage() {
  const { business, loading: authLoading, refresh: refreshAuth } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const [businessData, setBusinessData] = useState<any>(null)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    if (!authLoading && business) {
      setBusinessData({
        business_name: business.business_name || '',
        business_phone: business.phone || '',
        business_email: business.email || '',
        business_address: business.address || ''
      })
      fetchSettings()
    } else if (!authLoading && !business) {
      setLoading(false)
    }
  }, [authLoading, business])

  const fetchSettings = async () => {
    if (!business) return
    try {
      const res = await fetch(`/api/settings?business_id=${business.id}`, { headers: await getClientAuthHeaders() })
      if (res.ok) setSettings(await res.json())
    } catch (error) {} finally { setLoading(false) }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    
    try {
      // 1. Update Business Profile
      const bizRes = await fetch('/api/businesses/my', {
        method: 'PUT',
        headers: await getClientAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(businessData)
      })

      // 2. Update Settings
      const settingsRes = await fetch(`/api/settings?business_id=${business.id}`, {
        method: 'PUT',
        headers: await getClientAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ 
          settings: settings, 
          business_id: business.id 
        })
      })

      if (bizRes.ok && settingsRes.ok) {
        setMessage({ type: 'success', text: 'All settings updated successfully' })
        refreshAuth() // Refresh auth state to update business name globally
      } else {
        setMessage({ type: 'error', text: 'Some updates failed. Please try again.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally { setSaving(false) }
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" /></div>
  if (!business) return <div className="p-10 text-center text-slate-400">Please log in to access settings.</div>

  const paperWidth = settings?.receipt_paper_size === '80mm' ? 'w-[300px]' : 'w-[220px]'

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Configuration</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-slate-900 font-black h-10 text-xs px-8 rounded-xl shadow-lg shadow-slate-200 uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-xs font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Business Profile */}
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b py-4 px-6 flex flex-row items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm"><Building2 className="h-4 w-4 text-slate-400" /></div>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-600">Business Profile</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Business Name</Label>
                  <Input value={businessData?.business_name || ''} onChange={(e) => setBusinessData({ ...businessData, business_name: e.target.value })} className="h-10 text-xs font-bold rounded-xl border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Phone Number</Label>
                  <Input value={businessData?.business_phone || ''} onChange={(e) => setBusinessData({ ...businessData, business_phone: e.target.value })} className="h-10 text-xs font-bold rounded-xl border-slate-200" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email Address</Label>
                <Input value={businessData?.business_email || ''} onChange={(e) => setBusinessData({ ...businessData, business_email: e.target.value })} className="h-10 text-xs font-bold rounded-xl border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Address</Label>
                <Textarea value={businessData?.business_address || ''} onChange={(e) => setBusinessData({ ...businessData, business_address: e.target.value })} className="text-xs font-bold min-h-[100px] rounded-xl border-slate-200" />
              </div>
            </CardContent>
          </Card>

          {/* Taxes & Charges */}
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b py-4 px-6 flex flex-row items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm"><Percent className="h-4 w-4 text-slate-400" /></div>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-600">Financial Rules</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-700 uppercase tracking-tight">Value Added Tax (VAT)</p>
                  <p className="text-[10px] text-slate-500 font-bold">Calculate tax on each checkout</p>
                </div>
                <input type="checkbox" className="h-5 w-5 rounded-lg border-slate-300 accent-slate-900 cursor-pointer" checked={!!settings?.tax_enabled} onChange={(e) => setSettings({ ...settings, tax_enabled: e.target.checked })} />
              </div>
              {settings?.tax_enabled && (
                <div className="px-4 py-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tax Rate (%)</Label>
                  <div className="flex items-center gap-3">
                    <Input type="number" value={settings?.tax_rate || 0} onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) })} className="h-10 text-xs font-black w-24 rounded-xl border-slate-200" />
                    <span className="text-[10px] font-bold text-slate-400">Apply to all subtotal</span>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-700 uppercase tracking-tight">Service Charge</p>
                  <p className="text-[10px] text-slate-500 font-bold">Additional handling fee</p>
                </div>
                <input type="checkbox" className="h-5 w-5 rounded-lg border-slate-300 accent-slate-900 cursor-pointer" checked={!!settings?.service_enabled} onChange={(e) => setSettings({ ...settings, service_enabled: e.target.checked })} />
              </div>
              {settings?.service_enabled && (
                <div className="px-4 py-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Service Rate (%)</Label>
                  <div className="flex items-center gap-3">
                    <Input type="number" value={settings?.service_rate || 0} onChange={(e) => setSettings({ ...settings, service_rate: parseFloat(e.target.value) })} className="h-10 text-xs font-black w-24 rounded-xl border-slate-200" />
                    <span className="text-[10px] font-bold text-slate-400">Apply to all transactions</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Receipt Customization */}
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b py-4 px-6 flex flex-row items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm"><Receipt className="h-4 w-4 text-slate-400" /></div>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-600">Receipt Design</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Paper Size</Label>
                <Select value={settings?.receipt_paper_size || '58mm'} onValueChange={(val) => setSettings({ ...settings, receipt_paper_size: val })}>
                  <SelectTrigger className="h-10 text-xs font-bold rounded-xl border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58mm" className="text-xs font-black">Standard (58mm)</SelectItem>
                    <SelectItem value="80mm" className="text-xs font-black">Large (80mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Receipt Header</Label>
                <Input value={settings?.receipt_header || ''} onChange={(e) => setSettings({ ...settings, receipt_header: e.target.value })} placeholder="Store Name" className="h-10 text-xs font-bold rounded-xl border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Footer Note</Label>
                <Textarea value={settings?.receipt_footer || ''} onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })} placeholder="Thank you!" className="text-xs font-bold min-h-[100px] rounded-xl border-slate-200" />
              </div>
            </CardContent>
          </Card>

          {/* Receipt Preview */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
              <Printer size={12} />
              <span>Real-time Preview</span>
            </div>
            
            <div className={`${paperWidth} bg-white shadow-2xl rounded-sm p-6 relative border-t-8 border-slate-200 overflow-hidden`}>
              {/* Paper Zigzag Top */}
              <div className="absolute top-0 left-0 w-full flex justify-between px-1 -mt-1 opacity-10">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div key={i} className="w-2 h-2 bg-slate-500 rounded-full" />
                ))}
              </div>

              <div className="text-center mb-6 pt-4">
                <p className="font-black text-sm uppercase text-slate-900 break-words leading-tight">{settings?.receipt_header || businessData?.business_name || 'AEGIS POS'}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">{businessData?.business_address || 'Business Address'}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase">{businessData?.business_phone || 'Contact Number'}</p>
              </div>

              <div className="border-t border-dashed border-slate-200 my-4" />

              <div className="space-y-1 mb-4 text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                <div className="flex justify-between"><span>Order ID</span><span>#EXAMPLE</span></div>
                <div className="flex justify-between"><span>Date</span><span>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                <div className="flex justify-between"><span>Payment</span><span>CASH</span></div>
              </div>

              <div className="border-t border-dashed border-slate-200 my-4" />

              <div className="space-y-3 mb-4">
                <div className="text-[10px] font-bold text-slate-800">
                  <div className="flex justify-between mb-0.5">
                    <span className="flex-1 pr-4 leading-tight">Contoh Produk A</span>
                    <span className="font-black">15.000</span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium italic">1 x 15.000</div>
                </div>
                <div className="text-[10px] font-bold text-slate-800">
                  <div className="flex justify-between mb-0.5">
                    <span className="flex-1 pr-4 leading-tight">Sample Item B</span>
                    <span className="font-black">20.000</span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium italic">2 x 10.000</div>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 my-4" />

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                  <span>SUBTOTAL</span>
                  <span>35.000</span>
                </div>
                {settings?.tax_enabled && (
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>TAX ({settings.tax_rate}%)</span>
                    <span>{formatIDR(35000 * settings.tax_rate / 100)}</span>
                  </div>
                )}
                {settings?.service_enabled && (
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>SERVICE ({settings.service_rate}%)</span>
                    <span>{formatIDR(35000 * settings.service_rate / 100)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-black text-slate-900 pt-3 italic tracking-tighter">
                  <span>TOTAL</span>
                  <span>{formatIDR(35000 + (settings?.tax_enabled ? 35000 * settings.tax_rate / 100 : 0) + (settings?.service_enabled ? 35000 * settings.service_rate / 100 : 0))}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 my-6" />

              <div className="text-center space-y-2 mb-4">
                {settings?.receipt_footer ? settings.receipt_footer.split('\n').map((line: string, i: number) => (
                  <p key={i} className="text-[9px] font-black uppercase text-slate-400 leading-tight">{line}</p>
                )) : (
                  <p className="text-[9px] font-black uppercase text-slate-400 italic">Terima Kasih Atas Kunjungan Anda</p>
                )}
              </div>

              <div className="text-center mt-6 mb-2">
                 <div className="inline-block px-4 py-2 border-2 border-slate-900 rounded-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">PAID</p>
                 </div>
              </div>

              {/* Bottom Decorative Zigzag */}
              <div className="absolute bottom-0 left-0 w-full h-4 bg-slate-50 opacity-20 flex items-end">
                <div className="w-full border-b-[8px] border-dashed border-slate-300" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
