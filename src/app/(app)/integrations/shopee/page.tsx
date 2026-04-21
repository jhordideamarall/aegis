'use client'

import { ShoppingBag, Rocket, LayoutGrid, Package, TrendingUp, DollarSign, Loader2 } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function ShopeeIntegrationPage() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Shopee</h1>
            <Badge variant="secondary" className="bg-slate-100 text-slate-400 font-black text-[9px] uppercase px-2 h-5">Coming Soon</Badge>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Marketplace Central</p>
        </div>
        <Button disabled className="bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest px-8 h-11 opacity-50">
          Connect Seller Center
        </Button>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#EE4D2D] p-8 md:p-16 text-center space-y-6 shadow-2xl shadow-orange-100">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        
        <div className="inline-flex p-4 rounded-3xl bg-white/20 backdrop-blur-md mb-4">
          <ShoppingBag className="text-white w-10 h-10" />
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight max-w-2xl mx-auto">
          Scale your Shopee orders with <span className="text-white">Unified Automation</span>
        </h2>
        <p className="text-white/80 text-sm md:text-base max-w-xl mx-auto font-medium leading-relaxed">
          Manage your Shopee store, track revenue, and monitor order status without leaving Aegis POS. Simplify your multi-channel sales today.
        </p>
        <div className="pt-4 flex justify-center">
            <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] border border-white/20 px-4 py-1.5 rounded-full backdrop-blur-sm">Shopee Partner API Ready</span>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard 
          icon={TrendingUp}
          title="Revenue Tracker"
          description="Real-time reporting of your Shopee sales integrated with your local POS analytics."
        />
        <FeatureCard 
          icon={Package}
          title="Order Management"
          description="View pending, processed, and completed orders from Shopee in one unified list."
        />
        <FeatureCard 
          icon={LayoutGrid}
          title="Stock Sync"
          description="Automatically sync your inventory between Aegis and Shopee to prevent overselling."
        />
      </div>

      {/* Development Status */}
      <Card className="border-none bg-slate-50 rounded-3xl overflow-hidden">
        <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-2xl shadow-sm"><Rocket className="text-orange-600 w-6 h-6" /></div>
              <div>
                 <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Status: Phase 1 (OAuth Integration)</p>
                 <p className="text-xs font-bold text-slate-400 mt-0.5">Estimated launch: v1.6.0</p>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Authenticating with Shopee Platform...</span>
           </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <Card className="border-slate-100 shadow-sm rounded-3xl hover:border-slate-300 transition-all group overflow-hidden bg-white">
      <CardContent className="p-8 space-y-4">
        <div className="p-3 bg-slate-50 rounded-2xl w-fit group-hover:bg-[#EE4D2D] group-hover:text-white transition-all duration-500">
          <Icon size={20} />
        </div>
        <div className="space-y-2">
          <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">{title}</h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}
