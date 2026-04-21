'use client'

import { Cpu, Link2, Shield, Zap, Network, Loader2, Key } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function MCPServerPage() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">MCP Server</h1>
            <Badge variant="secondary" className="bg-slate-100 text-slate-400 font-black text-[9px] uppercase px-2 h-5">Alpha In-progress</Badge>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">External AI Protocol</p>
        </div>
        <Button disabled className="bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest px-8 h-11 opacity-50">
          Get Config Link
        </Button>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-50 p-12 md:p-20 text-center space-y-6 border border-slate-100 shadow-sm">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        
        <div className="inline-flex p-4 rounded-3xl bg-slate-900 text-white mb-4 shadow-xl">
          <Cpu className="w-10 h-10" />
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter leading-tight max-w-2xl mx-auto">
          Connect Aegis to <span className="text-slate-400 underline decoration-slate-200 underline-offset-8">Any AI Agent</span>
        </h2>
        <p className="text-slate-500 text-sm md:text-base max-w-xl mx-auto font-medium leading-relaxed">
          The Model Context Protocol (MCP) allows you to securely share your business data with Claude, Gemini, or other AI tools via a simple link.
        </p>
        <div className="flex items-center justify-center gap-2 pt-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border border-slate-200">Open Standard Integration</span>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard 
          icon={Link2}
          title="Direct AI Bridge"
          description="Copy a single link to your AI Desktop and start asking about your inventory or sales instantly."
        />
        <FeatureCard 
          icon={Key}
          title="Secure Personal Access"
          description="Generate unique tokens for your AI agents with granular control over what they can see."
        />
        <FeatureCard 
          icon={Network}
          title="Remote Connectivity"
          description="Access your business analytics from anywhere through standard AI protocol endpoints."
        />
      </div>

      {/* Development Status */}
      <Card className="border-none bg-slate-900 rounded-3xl overflow-hidden shadow-2xl">
        <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-4 text-white">
              <div className="p-3 bg-white/10 rounded-2xl"><Zap className="text-white w-6 h-6" /></div>
              <div>
                 <p className="text-sm font-black uppercase tracking-tight">Status: Building SSE Transport</p>
                 <p className="text-xs font-bold text-slate-400 mt-0.5">Developing the Server-Sent Events architecture for cloud access.</p>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Standardizing Aegis-MCP Schema...</span>
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
