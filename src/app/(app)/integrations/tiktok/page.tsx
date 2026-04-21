'use client'

import { Store, Rocket, Music2, ShoppingBag, Zap, BarChart, Loader2 } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function TikTokIntegrationPage() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">TikTok Shop</h1>
            <Badge variant="secondary" className="bg-slate-100 text-slate-400 font-black text-[9px] uppercase px-2 h-5">Coming Soon</Badge>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Viral Commerce Hub</p>
        </div>
        <Button disabled className="bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest px-8 h-11 opacity-50">
          Connect TikTok Shop
        </Button>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-black p-8 md:p-16 text-center space-y-6 shadow-2xl shadow-slate-300">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #25F4EE 1px, transparent 0), radial-gradient(circle at 12px 12px, #FE2C55 1px, transparent 0)', backgroundSize: '48px 48px' }}></div>
        
        <div className="inline-flex p-4 rounded-3xl bg-white/10 backdrop-blur-md mb-4 border border-white/10">
          <Store className="text-white w-10 h-10" />
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight max-w-2xl mx-auto">
          Turn viral trends into <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#25F4EE] via-white to-[#FE2C55]">Instant Sales</span>
        </h2>
        <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto font-medium leading-relaxed">
          The power of TikTok Shop, now inside your POS. Track orders from live streams and short videos in real-time.
        </p>
        <div className="flex justify-center gap-4 pt-4">
           <div className="flex items-center gap-2 px-4 py-2 bg-[#25F4EE]/10 rounded-full border border-[#25F4EE]/20">
              <Zap size={14} className="text-[#25F4EE]" />
              <span className="text-[10px] font-black text-[#25F4EE] uppercase tracking-widest">Real-time Sync</span>
           </div>
           <div className="flex items-center gap-2 px-4 py-2 bg-[#FE2C55]/10 rounded-full border border-[#FE2C55]/20">
              <Music2 size={14} className="text-[#FE2C55]" />
              <span className="text-[10px] font-black text-[#FE2C55] uppercase tracking-widest">Creator Ready</span>
           </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard 
          icon={BarChart}
          title="Stream Analytics"
          description="See how much revenue your live streams generate per hour compared to store sales."
        />
        <FeatureCard 
          icon={ShoppingBag}
          title="Consolidated Orders"
          description="Fulfill TikTok Shop orders alongside your offline sales for maximum efficiency."
        />
        <FeatureCard 
          icon={Rocket}
          title="Inventory Automation"
          description="Keep your stock levels accurate across TikTok and your physical store automatically."
        />
      </div>

      {/* Development Status */}
      <Card className="border-none bg-slate-50 rounded-3xl overflow-hidden">
        <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-2xl shadow-sm"><Rocket className="text-slate-900 w-6 h-6" /></div>
              <div>
                 <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Status: Phase 1 (Research & API Access)</p>
                 <p className="text-xs font-bold text-slate-400 mt-0.5">Estimated launch: Late Q2 2026</p>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Preparing ByteDance OAuth...</span>
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
        <div className="p-3 bg-slate-50 rounded-2xl w-fit group-hover:bg-black group-hover:text-white transition-all duration-500">
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
