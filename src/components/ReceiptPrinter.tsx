'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/Modal'

interface ReceiptPrinterProps {
  order: {
    id: string
    total: number
    payment_method: string
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

interface Printer {
  name: string
  displayName?: string
  description?: string
  default?: boolean
}

interface ReceiptSettings {
  receipt_header: string
  receipt_footer: string
  receipt_paper_size: '58mm' | '80mm'
  tax_enabled: boolean
  tax_rate: number
  service_enabled: boolean
  service_rate: number
}

const defaultSettings: ReceiptSettings = {
  receipt_header: 'POS System',
  receipt_footer: 'Terima Kasih!\nBarang yang sudah dibeli\ntidak dapat ditukar/dikembalikan',
  receipt_paper_size: '58mm',
  tax_enabled: false,
  tax_rate: 0,
  service_enabled: false,
  service_rate: 0
}

export default function ReceiptPrinter({ order, onClose, businessId }: ReceiptPrinterProps) {
  const [printers, setPrinters] = useState<Printer[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState<string>('')
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('58mm')
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<ReceiptSettings>(defaultSettings)

  useEffect(() => {
    detectPrinters()
    fetchSettings()
  }, [])

  const detectPrinters = async () => {
    try {
      if ('print' in window) {
        setPrinters([{ name: 'default', displayName: 'System Default Printer' }])
        setSelectedPrinter('default')
      }
    } catch (error) {
      console.error('Error detecting printers:', error)
    }
  }

  const fetchSettings = async () => {
    try {
      const url = businessId ? `/api/settings?business_id=${businessId}` : '/api/settings'
      const res = await fetch(url)
      const data = await res.json()
      const nextSettings: ReceiptSettings = {
        receipt_header: data.receipt_header || defaultSettings.receipt_header,
        receipt_footer: data.receipt_footer || defaultSettings.receipt_footer,
        receipt_paper_size: (data.receipt_paper_size as '58mm' | '80mm') || defaultSettings.receipt_paper_size,
        tax_enabled: data.tax_enabled === true || data.tax_enabled === 'true',
        tax_rate: Number(data.tax_rate) || 0,
        service_enabled: data.service_enabled === true || data.service_enabled === 'true',
        service_rate: Number(data.service_rate) || 0
      }
      setSettings(nextSettings)
      setPaperSize(nextSettings.receipt_paper_size)
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const handlePrint = async () => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    window.print()
    setLoading(false)
    onClose()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const items = order.order_items || []
  const member = order.member
  const discount = order.discount || 0
  const pointsUsed = order.points_used || 0
  const pointsEarned = order.points_earned || 0
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const taxableBase = Math.max(subtotal - discount, 0)
  const taxAmount = settings.tax_enabled ? Math.round((taxableBase * settings.tax_rate) / 100) : 0
  const serviceAmount = settings.service_enabled ? Math.round((taxableBase * settings.service_rate) / 100) : 0
  const grandTotal = taxableBase + taxAmount + serviceAmount

  return (
    <Modal isOpen={true} onClose={onClose} title="Cetak Struk" size="xl">
      {/* Printer Selection */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-3">Pengaturan Printer</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Printer</label>
            <select
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {printers.map((printer) => (
                <option key={printer.name} value={printer.name}>{printer.displayName || printer.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">* Printer thermal akan terdeteksi otomatis</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ukuran Kertas</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaperSize('58mm')}
                className={`py-2 px-4 rounded-lg border-2 font-medium transition-colors ${paperSize === '58mm' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 hover:border-gray-300'}`}
              >
                58mm
              </button>
              <button
                onClick={() => setPaperSize('80mm')}
                className={`py-2 px-4 rounded-lg border-2 font-medium transition-colors ${paperSize === '80mm' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 hover:border-gray-300'}`}
              >
                80mm
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">* Default: {settings.receipt_paper_size}</p>
          </div>
        </div>
      </div>

      {/* Receipt Preview */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Preview Struk</h3>
        <div className="flex justify-center">
          <div
            className={`bg-white border border-gray-200 shadow-sm print-container ${paperSize === '58mm' ? 'max-w-[58mm]' : 'max-w-[80mm]'}`}
            style={{ width: paperSize === '58mm' ? '58mm' : '80mm', minHeight: '200px', padding: '8px', fontFamily: 'monospace', fontSize: paperSize === '58mm' ? '10px' : '12px' }}
          >
            {/* Receipt Content */}
            <div className="text-center mb-2">
              <h4 className="font-bold" style={{ fontSize: paperSize === '58mm' ? '12px' : '14px' }}>{settings.receipt_header}</h4>
            </div>

            <div className="border-t border-dashed border-gray-400 my-2"></div>

            <div className="text-left mb-2" style={{ fontSize: paperSize === '58mm' ? '8px' : '10px' }}>
              <p>No: {order.id.slice(0, 8).toUpperCase()}</p>
              <p>Tanggal: {formatDate(order.created_at)}</p>
              <p>Payment: {order.payment_method.toUpperCase()}</p>
              {member && (
                <>
                  <p>Member: {member.name}</p>
                  <p>Telp: {member.phone}</p>
                </>
              )}
            </div>

            <div className="border-t border-dashed border-gray-400 my-2"></div>

            {/* Items */}
            <div className="mb-2">
              {items.map((item, index) => (
                <div key={index} className="mb-1" style={{ fontSize: paperSize === '58mm' ? '8px' : '10px' }}>
                  <div className="flex justify-between">
                    <span className="font-medium">{item.product?.name || 'Item'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{item.qty} x {formatIDR(item.price)}</span>
                    <span>{formatIDR(item.price * item.qty)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-400 my-2"></div>

            {/* Subtotal */}
            <div className="flex justify-between mb-1" style={{ fontSize: paperSize === '58mm' ? '8px' : '10px' }}>
              <span>Subtotal</span>
              <span>{formatIDR(subtotal)}</span>
            </div>

            {/* Discount */}
            {discount > 0 && (
              <>
                <div className="flex justify-between mb-1" style={{ fontSize: paperSize === '58mm' ? '8px' : '10px' }}>
                  <span>Discount</span>
                  <span>-{formatIDR(discount)}</span>
                </div>
                <div className="flex justify-between text-xs mb-1" style={{ fontSize: paperSize === '58mm' ? '7px' : '9px' }}>
                  <span>({pointsUsed} points)</span>
                </div>
              </>
            )}

            {settings.tax_enabled && (
              <div className="flex justify-between mb-1" style={{ fontSize: paperSize === '58mm' ? '8px' : '10px' }}>
                <span>Tax ({settings.tax_rate}%)</span>
                <span>{formatIDR(taxAmount)}</span>
              </div>
            )}

            {settings.service_enabled && (
              <div className="flex justify-between mb-1" style={{ fontSize: paperSize === '58mm' ? '8px' : '10px' }}>
                <span>Service ({settings.service_rate}%)</span>
                <span>{formatIDR(serviceAmount)}</span>
              </div>
            )}

            {/* Total */}
            <div className="border-t border-dashed border-gray-400 my-2"></div>
            <div className="flex justify-between font-bold mb-2" style={{ fontSize: paperSize === '58mm' ? '10px' : '12px' }}>
              <span>TOTAL</span>
              <span>{formatIDR(grandTotal)}</span>
            </div>

            {/* Points Earned */}
            {pointsEarned > 0 && (
              <div className="text-center mt-2" style={{ fontSize: paperSize === '58mm' ? '7px' : '9px' }}>
                <p>You earned {pointsEarned} points</p>
              </div>
            )}

            <div className="border-t border-dashed border-gray-400 my-2"></div>

            {/* Footer */}
            <div className="text-center mt-2" style={{ fontSize: paperSize === '58mm' ? '8px' : '10px' }}>
              {settings.receipt_footer ? settings.receipt_footer.split('\\n').map((line, i) => (<p key={i}>{line}</p>)) : (<p>Terima Kasih!</p>)}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
        <button onClick={handlePrint} disabled={loading} className="flex-1 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">{loading ? 'Mencetak...' : '🖨️ Cetak Struk'}</button>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: ${paperSize === '58mm' ? '58mm' : '80mm'} auto;
            margin: 0;
          }

          body * {
            visibility: hidden;
          }

          .print-container, .print-container * {
            visibility: visible;
          }

          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: ${paperSize === '58mm' ? '58mm' : '80mm'} !important;
            padding: 8px !important;
            font-family: monospace !important;
            font-size: ${paperSize === '58mm' ? '10px' : '12px'} !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </Modal>
  )
}
