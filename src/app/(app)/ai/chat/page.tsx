'use client'

import { Rocket, Sparkles, Brain, Zap, BarChart, Loader2, MessageSquare } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function ChatAegisPage() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">ChatAegis</h1>
            <Badge variant="secondary" className="bg-slate-100 text-slate-400 font-black text-[9px] uppercase px-2 h-5">Coming Soon</Badge>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Next-Gen AI Business Assistant</p>
        </div>
        <Button disabled className="bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest px-8 h-11 opacity-50">
          Join Waitlist
        </Button>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-12 md:p-20 text-center space-y-6 shadow-2xl shadow-slate-300">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #6366f1 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/20">
          <Sparkles className="text-white" size={32} />
        </div>

        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight max-w-2xl mx-auto">
          Talk to your business like <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Never Before</span>
        </h2>
        
        <p className="text-slate-400 font-medium max-w-xl mx-auto text-sm md:text-base leading-relaxed">
          ChatAegis analyzes your sales, inventory, and customer trends in real-time. Ask questions, get insights, and grow your business with a premium AI partner.
        </p>

        <div className="pt-4 flex flex-wrap justify-center gap-3">
          <Badge className="bg-white/5 text-white/60 border-white/10 px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest">
            Claude 3.5 Powered
          </Badge>
          <Badge className="bg-white/5 text-white/60 border-white/10 px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest">
            Context Aware
          </Badge>
          <Badge className="bg-white/5 text-white/60 border-white/10 px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest">
            Data Visualization
          </Badge>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: Brain,
            title: "Business Intelligence",
            desc: "Understand complex sales patterns through natural conversation.",
            color: "text-indigo-500",
            bg: "bg-indigo-50"
          },
          {
            icon: BarChart,
            title: "Dynamic Artifacts",
            desc: "Instant charts and reports generated as you chat.",
            color: "text-purple-500",
            bg: "bg-purple-50"
          },
          {
            icon: Zap,
            title: "Real-time Sync",
            desc: "Directly connected to your AEGIS POS live database.",
            color: "text-amber-500",
            bg: "bg-amber-50"
          }
        ].map((feat, i) => (
          <Card key={i} className="border-none shadow-none bg-slate-50/50 rounded-[2rem] overflow-hidden group hover:bg-white hover:shadow-xl hover:shadow-slate-200 transition-all duration-500">
            <CardContent className="p-8 space-y-4">
              <div className={`w-12 h-12 ${feat.bg} rounded-2xl flex items-center justify-center ${feat.color} group-hover:scale-110 transition-transform duration-500`}>
                <feat.icon size={24} />
              </div>
              <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">{feat.title}</h3>
              <p className="text-slate-500 text-xs font-bold leading-relaxed tracking-wide">
                {feat.desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Footer */}
      <div className="bg-slate-900 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 animate-pulse"></div>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
            50+ Businesses on Early Access
          </p>
        </div>
        <div className="flex items-center gap-2 text-indigo-400 relative z-10">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-widest">Aegis Intelligence is Tuning...</span>
        </div>
      </div>
    </div>
  )
}
