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
  Printer,
  Star,
  Bot
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
import ReceiptPrinter from '@/components/ReceiptPrinter'

function MemberPointsCard({ settings, setSettings }: { settings: any; setSettings: (s: any) => void }) {
  const [calcTab, setCalcTab] = useState<'earn' | 'redeem'>('earn')
  const [calcInput, setCalcInput] = useState('')

  const earnRate = Number(settings?.points_earn_rate) || 10000
  const redeemRate = Number(settings?.points_redeem_rate) || 100
  const minRedeem = Number(settings?.points_min_redeem) || 20
  const enabled = settings?.points_enabled !== false && settings?.points_enabled !== 'false'

  const calcNum = Number(calcInput.replace(/\D/g, '')) || 0
  const earnResult = calcTab === 'earn' ? Math.floor(calcNum / earnRate) : null
  const redeemResult = calcTab === 'redeem' ? calcNum * redeemRate : null
  const belowMin = calcTab === 'redeem' && calcNum > 0 && calcNum < minRedeem

  return (
    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
      <CardHeader className="bg-slate-50/50 border-b py-4 px-6 flex flex-row items-center gap-3">
        <div className="p-2 bg-white rounded-lg shadow-sm"><Star className="h-4 w-4 text-slate-400" /></div>
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-600">Program Poin Member</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-700 uppercase tracking-tight">Aktifkan Program Poin</p>
                <p className="text-[10px] text-slate-500 font-bold">Member dapat poin dari setiap transaksi</p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 rounded-lg border-slate-300 accent-slate-900 cursor-pointer"
                checked={enabled}
                onChange={(e) => setSettings({ ...settings, points_enabled: e.target.checked })}
              />
            </div>

            {enabled && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Earn Rate</Label>
                  <p className="text-[10px] text-slate-400">Setiap belanja Rp berapa = 1 poin</p>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={settings?.points_earn_rate ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      setSettings({ ...settings, points_earn_rate: raw === '' ? '' : Number(raw) })
                    }}
                    className="h-10 text-sm font-bold rounded-xl border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nilai Poin (Redeem Rate)</Label>
                  <p className="text-[10px] text-slate-400">1 poin = Rp berapa diskon</p>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={settings?.points_redeem_rate ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      setSettings({ ...settings, points_redeem_rate: raw === '' ? '' : Number(raw) })
                    }}
                    className="h-10 text-sm font-bold rounded-xl border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Minimum Redeem</Label>
                  <p className="text-[10px] text-slate-400">Poin minimum untuk bisa redeem</p>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={settings?.points_min_redeem ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      setSettings({ ...settings, points_min_redeem: raw === '' ? '' : Number(raw) })
                    }}
                    className="h-10 text-sm font-bold rounded-xl border-slate-200"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Calculator Widget */}
          <div className={`rounded-2xl border border-slate-100 bg-slate-50 p-5 flex flex-col gap-4 ${!enabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Kalkulator Simulasi</p>

            {/* Tab */}
            <div className="flex gap-1 bg-slate-200/60 p-1 rounded-xl self-start">
              {(['earn', 'redeem'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setCalcTab(t); setCalcInput('') }}
                  className={`px-4 h-7 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${calcTab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                  {t === 'earn' ? 'Earn' : 'Redeem'}
                </button>
              ))}
            </div>

            {calcTab === 'earn' ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400">Nominal belanja (Rp)</Label>
                  <Input
                    type="number"
                    placeholder="contoh: 100000"
                    value={calcInput}
                    onChange={(e) => setCalcInput(e.target.value)}
                    className="h-10 text-sm font-bold rounded-xl border-slate-200 bg-white"
                  />
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
                  <p className="text-[10px] text-slate-400 font-bold mb-1">Poin didapat</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tight">
                    {calcInput ? earnResult : '—'}
                  </p>
                  {calcInput && earnResult === 0 && (
                    <p className="text-[10px] text-slate-400 mt-1">Belanja minimal Rp {earnRate.toLocaleString('id-ID')} untuk dapat 1 poin</p>
                  )}
                  {calcInput && earnResult !== null && earnResult > 0 && (
                    <p className="text-[10px] text-slate-400 mt-1">= Rp {(earnResult * redeemRate).toLocaleString('id-ID')} nilai diskon potensial</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400">Jumlah poin</Label>
                  <Input
                    type="number"
                    placeholder={`min. ${minRedeem} poin`}
                    value={calcInput}
                    onChange={(e) => setCalcInput(e.target.value)}
                    className="h-10 text-sm font-bold rounded-xl border-slate-200 bg-white"
                  />
                </div>
                <div className={`rounded-xl border p-4 text-center ${belowMin ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'}`}>
                  <p className="text-[10px] text-slate-400 font-bold mb-1">Nilai diskon</p>
                  <p className={`text-3xl font-black tracking-tight ${belowMin ? 'text-rose-400' : 'text-slate-900'}`}>
                    {calcInput ? (belowMin ? '✗' : `Rp ${redeemResult?.toLocaleString('id-ID')}`) : '—'}
                  </p>
                  {belowMin && (
                    <p className="text-[10px] text-rose-400 mt-1">Butuh minimal {minRedeem} poin untuk redeem</p>
                  )}
                  {!belowMin && calcInput && redeemResult !== null && redeemResult > 0 && (
                    <p className="text-[10px] text-slate-400 mt-1">= {calcNum} poin × Rp {redeemRate.toLocaleString('id-ID')}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

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
        pic_name: business.pic_name || '',
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
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nama PIC</Label>
                  <Input value={businessData?.pic_name || ''} onChange={(e) => setBusinessData({ ...businessData, pic_name: e.target.value })} placeholder="Nama pemilik / penanggung jawab" className="h-10 text-xs font-bold rounded-xl border-slate-200" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Phone Number</Label>
                  <Input value={businessData?.business_phone || ''} onChange={(e) => setBusinessData({ ...businessData, business_phone: e.target.value })} className="h-10 text-xs font-bold rounded-xl border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email Address</Label>
                  <Input value={businessData?.business_email || ''} onChange={(e) => setBusinessData({ ...businessData, business_email: e.target.value })} className="h-10 text-xs font-bold rounded-xl border-slate-200" />
                </div>
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
          {/* Member Points */}
          <MemberPointsCard settings={settings} setSettings={setSettings} />

          {/* AI Assistant Personalization */}
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b py-4 px-6 flex flex-row items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm"><Bot className="h-4 w-4 text-slate-400" /></div>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-600">Personalisasi Asisten</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nama Asisten</Label>
                <p className="text-[10px] text-slate-400">Nama yang dipakai AI saat memperkenalkan diri</p>
                <Input
                  value={settings?.assistant_name ?? ''}
                  onChange={(e) => setSettings({ ...settings, assistant_name: e.target.value })}
                  placeholder="contoh: Aegis, Jarvis..."
                  className="h-10 text-sm font-bold rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Custom Instruction <span className="normal-case font-medium">(opsional)</span></Label>
                <p className="text-[10px] text-slate-400">Instruksi tambahan untuk AI — fokus, kepribadian, atau konteks spesifik bisnis kamu</p>
                <Textarea
                  value={settings?.assistant_instruction ?? ''}
                  onChange={(e) => setSettings({ ...settings, assistant_instruction: e.target.value })}
                  placeholder="contoh: Selalu sebut nama toko kami &quot;Warung Kopi Senja&quot;. Fokus ke menu kopi dan dessert."
                  className="text-sm font-medium min-h-[90px] rounded-xl border-slate-200 resize-none"
                />
              </div>
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
            
            <ReceiptPrinter 
              isEmbedded 
              customSettings={{ 
                ...settings, 
                ...businessData,
                business_name: businessData?.business_name,
                business_address: businessData?.business_address,
                business_phone: businessData?.business_phone
              }} 
              onClose={() => {}} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}
