'use client'

import { Rocket, BarChart3, Heart, Users, Target, Loader2 } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function InstagramIntegrationPage() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Instagram</h1>
            <Badge variant="secondary" className="bg-slate-100 text-slate-400 font-black text-[9px] uppercase px-2 h-5">Coming Soon</Badge>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Social Media Insights</p>
        </div>
        <Button disabled className="bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest px-8 h-11 opacity-50">
          Connect Account
        </Button>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-12 md:p-20 text-center space-y-6 shadow-2xl shadow-slate-200">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        
        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight max-w-2xl mx-auto">
          Unleash your brand power with <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Instagram Insights</span>
        </h2>
        <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto font-medium leading-relaxed">
          Soon you will be able to monitor your Instagram performance directly from Aegis POS. Turn your social engagement into business growth.
        </p>
        <div className="flex items-center justify-center gap-2 pt-4">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Joining 500+ businesses globally</span>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard 
          icon={BarChart3}
          title="Growth Analytics"
          description="Track your follower growth and profile visits over time with precision."
        />
        <FeatureCard 
          icon={Target}
          title="Top Performing Content"
          description="Identify which Reels or Posts generate the most engagement and reach."
        />
        <FeatureCard 
          icon={Users}
          title="Audience Demographics"
          description="Understand who your customers are: location, age, and active hours."
        />
      </div>

      {/* Development Status */}
      <Card className="border-none bg-slate-50 rounded-3xl overflow-hidden">
        <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-2xl shadow-sm"><Rocket className="text-slate-900 w-6 h-6" /></div>
              <div>
                 <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Status: Phase 2 (Data Sync)</p>
                 <p className="text-xs font-bold text-slate-400 mt-0.5">Estimated launch: Next major update (v1.5.0)</p>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Preparing Meta API Bridge...</span>
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
        <div className="p-3 bg-slate-50 rounded-2xl w-fit group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
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
