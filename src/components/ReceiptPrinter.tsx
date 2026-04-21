'use client'

import { useEffect, useState } from 'react'
import { getClientAuthHeaders } from '@/lib/clientAuth'
import { formatPaymentDisplay } from '@/lib/payments'
import { formatIDR } from '@/lib/utils'
import { 
  Printer, 
  X, 
  Settings as SettingsIcon, 
  Eye, 
  Download, 
  CheckCircle2,
  FileText,
  CreditCard,
  User,
  Smartphone
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface ReceiptPrinterProps {
  order: {
    id: string
    total: number
    payment_method: string
    payment_provider?: string | null
    payment_proof_url?: string | null
    payment_proof_uploaded_at?: string | null
    payment_notes?: string | null
    created_at: string
    member_id?: string | null
    points_earned?: number
    points_used?: number
    discount?: number
    order_items: {
      id: string
      product_id: string
      qty: number
      price: number
      product?: { name: string; price?: number }
    }[]
    member?: { name: string; phone: string } | null
  }
  onClose: () => void
  businessId?: string
}

interface ReceiptSettings {
  receipt_header: string
  receipt_footer: string
  receipt_paper_size: '58mm' | '80mm'
  tax_enabled: boolean
  tax_rate: number
  service_enabled: boolean
  service_rate: number
  business_name?: string
  business_address?: string
  business_phone?: string
}

export default function ReceiptPrinter({ order, onClose, businessId }: ReceiptPrinterProps) {
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('58mm')
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<ReceiptSettings | null>(null)
  const [activeTab, setActiveTab] = useState('preview')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const url = businessId ? `/api/settings?business_id=${businessId}` : '/api/settings'
      const res = await fetch(url, { headers: await getClientAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        setPaperSize(data.receipt_paper_size || '58mm')
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const items = order.order_items || []
  const discount = order.discount || 0
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const taxableBase = Math.max(subtotal - discount, 0)
  const taxAmount = settings?.tax_enabled ? Math.round((taxableBase * settings.tax_rate) / 100) : 0
  const serviceAmount = settings?.service_enabled ? Math.round((taxableBase * settings.service_rate) / 100) : 0
  const grandTotal = taxableBase + taxAmount + serviceAmount
  const paymentDisplay = formatPaymentDisplay(order.payment_method, order.payment_provider)

  const paperWidthClass = paperSize === '80mm' ? 'w-[320px]' : 'w-[240px]'

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-slate-50 border-none shadow-2xl rounded-3xl">
        <div className="flex flex-col md:flex-row h-[85vh] md:h-auto max-h-[90vh]">
          
          {/* Left Sidebar - Details & Options */}
          <div className="w-full md:w-[280px] bg-white border-r border-slate-100 p-6 flex flex-col justify-between">
            <div className="space-y-8">
              <div>
                <Badge variant="outline" className="mb-2 text-[9px] font-black uppercase tracking-widest border-slate-200 text-slate-400">Transaction ID</Badge>
                <h2 className="text-lg font-black text-slate-900 tracking-tighter">#{order.id.slice(0, 8).toUpperCase()}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{formatDate(order.created_at)}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 group">
                  <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-all"><CreditCard size={14} /></div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment</p>
                    <p className="text-xs font-bold text-slate-700">{formatPaymentDisplay(order.payment_method, order.payment_provider)}</p>
                  </div>
                </div>

                {order.member && (
                  <div className="flex items-center gap-3 group">
                    <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-all"><User size={14} /></div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</p>
                      <p className="text-xs font-bold text-slate-700 truncate w-32">{order.member.name}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3 group">
                  <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-all"><Smartphone size={14} /></div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Paper Size</p>
                    <div className="flex gap-1 mt-1">
                      <button 
                        onClick={() => setPaperSize('58mm')}
                        className={`text-[9px] px-2 py-0.5 rounded font-black border ${paperSize === '58mm' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                      >58MM</button>
                      <button 
                        onClick={() => setPaperSize('80mm')}
                        className={`text-[9px] px-2 py-0.5 rounded font-black border ${paperSize === '80mm' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                      >80MM</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-8">
              <Button onClick={handlePrint} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-200 transition-all hover:scale-[1.02] active:scale-95">
                <Printer className="mr-2 h-4 w-4" /> Print Receipt
              </Button>
              <Button variant="ghost" onClick={onClose} className="w-full h-10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900">
                Close View
              </Button>
            </div>
          </div>

          {/* Right Area - Receipt Preview Content */}
          <div className="flex-1 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-white flex justify-center">
                <TabsList className="bg-slate-100 p-1 rounded-xl h-9">
                  <TabsTrigger value="preview" className="text-[10px] font-black uppercase px-6 h-7 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Receipt Preview</TabsTrigger>
                  {order.payment_proof_url && (
                    <TabsTrigger value="proof" className="text-[10px] font-black uppercase px-6 h-7 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Payment Proof</TabsTrigger>
                  )}
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start no-scrollbar">
                <TabsContent value="preview" className="m-0 focus-visible:ring-0 no-scrollbar">
                  <div className={`${paperWidthClass} bg-white shadow-2xl rounded-sm p-6 relative border-t-8 border-slate-200 overflow-hidden print-container animate-in fade-in zoom-in-95 duration-500`}>
                    {/* Paper Zigzag Top */}
                    <div className="absolute top-0 left-0 w-full flex justify-between px-1 -mt-1 opacity-10 no-print">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div key={i} className="w-2 h-2 bg-slate-500 rounded-full" />
                      ))}
                    </div>

                    {/* Receipt Content */}
                    <div className="text-center mb-6 pt-4">
                      <p className="font-black text-sm uppercase text-slate-900 break-words leading-tight">{settings?.receipt_header || settings?.business_name || 'AEGIS POS'}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">{settings?.business_address || 'Business Address'}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{settings?.business_phone || 'Contact Number'}</p>
                    </div>

                    <div className="border-t border-dashed border-slate-200 my-4" />

                    <div className="space-y-1 mb-4 text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                      <div className="flex justify-between"><span>Order ID</span><span>#{order.id.slice(0, 8).toUpperCase()}</span></div>
                      <div className="flex justify-between"><span>Date</span><span>{formatDate(order.created_at)}</span></div>
                      <div className="flex justify-between"><span>Payment</span><span>{paymentDisplay}</span></div>
                      {order.member && <div className="flex justify-between"><span>Customer</span><span>{order.member.name}</span></div>}
                    </div>

                    <div className="border-t border-dashed border-slate-200 my-4" />

                    <div className="space-y-3 mb-6">
                      {items.map((item, index) => (
                        <div key={index} className="text-[10px] font-bold text-slate-800">
                          <div className="flex justify-between mb-0.5">
                            <span className="flex-1 pr-4 leading-tight">{item.product?.name || 'Item'}</span>
                            <span className="font-black">{formatIDR(item.price * item.qty)}</span>
                          </div>
                          <div className="text-[9px] text-slate-400 font-medium italic">
                            {item.qty} x {formatIDR(item.price)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-dashed border-slate-200 my-4" />

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>SUBTOTAL</span>
                        <span>{formatIDR(subtotal)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-[10px] font-bold text-emerald-600">
                          <span>DISCOUNT</span>
                          <span>-{formatIDR(discount)}</span>
                        </div>
                      )}
                      {settings?.tax_enabled && (
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>TAX ({settings.tax_rate}%)</span>
                          <span>{formatIDR(taxAmount)}</span>
                        </div>
                      )}
                      {settings?.service_enabled && (
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>SERVICE ({settings.service_rate}%)</span>
                          <span>{formatIDR(serviceAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xl font-black text-slate-900 pt-3 italic tracking-tighter">
                        <span>TOTAL</span>
                        <span>{formatIDR(grandTotal)}</span>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-slate-200 my-6" />

                    <div className="text-center space-y-2 mb-4">
                      {settings?.receipt_footer ? settings.receipt_footer.split('\n').map((line: string, i: number) => (
                        <p key={i} className="text-[9px] font-black uppercase text-slate-400 leading-tight">{line}</p>
                      )) : (
                        <p className="text-[9px] font-black uppercase text-slate-400 italic">Thank you for your purchase!</p>
                      )}
                    </div>

                    <div className="text-center mt-6 mb-2">
                       <div className="inline-block px-4 py-2 border-2 border-slate-900 rounded-sm">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">PAID</p>
                       </div>
                    </div>

                    {/* Bottom Decorative Zigzag */}
                    <div className="absolute bottom-0 left-0 w-full h-4 bg-slate-50 opacity-20 flex items-end no-print">
                      <div className="w-full border-b-[8px] border-dashed border-slate-300" />
                    </div>
                  </div>
                </TabsContent>

                {order.payment_proof_url && (
                  <TabsContent value="proof" className="m-0 focus-visible:ring-0 w-full h-full flex flex-col items-center">
                    <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-100 w-full max-w-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <img 
                        src={order.payment_proof_url} 
                        alt="Payment Proof" 
                        className="w-full rounded-2xl object-contain bg-slate-50 border border-slate-50"
                        style={{ maxHeight: '60vh' }}
                      />
                      <div className="mt-4 p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <div className="p-2 bg-emerald-500 text-white rounded-full"><CheckCircle2 size={16} /></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Verified Proof</span>
                         </div>
                         <a href={order.payment_proof_url} target="_blank" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">Full View</a>
                      </div>
                    </div>
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </div>

        </div>
      </DialogContent>

      <style jsx global>{`
        @media print {
          @page {
            size: ${paperSize === '58mm' ? '58mm' : '80mm'} auto;
            margin: 0;
          }

          body * {
            visibility: hidden;
            background: none !important;
          }

          .print-container, .print-container * {
            visibility: visible;
          }

          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: ${paperSize === '58mm' ? '58mm' : '80mm'} !important;
            padding: 16px !important;
            font-family: monospace !important;
            box-shadow: none !important;
            border: none !important;
          }

          .no-print {
            display: none !important;
          }
        }
        
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </Dialog>
  )
}
