'use client'

import { useEffect, useState } from 'react'
import { 
  Cpu, 
  Link2, 
  Shield, 
  Zap, 
  Network, 
  Loader2, 
  Key, 
  Copy, 
  CheckCircle2, 
  Terminal, 
  Eye, 
  EyeOff, 
  ExternalLink,
  ChevronRight,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from '@/hooks/useAuth'
import { getMcpApiKey, generateMcpApiKey } from '@/actions/mcp'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from 'sonner'

export default function MCPServerPage() {
  const { business, loading: authLoading } = useAuth()
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (business) {
      loadApiKey()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [business, authLoading])

  async function loadApiKey() {
    if (!business) return
    try {
      const key = await getMcpApiKey(business.id)
      setApiKey(key)
    } catch (error) {
      console.error('Failed to load API key:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateKey() {
    if (!business) return
    if (apiKey && !confirm('Generating a new key will invalidate your current key. Continue?')) return

    setGenerating(true)
    try {
      const newKey = await generateMcpApiKey(business.id)
      setApiKey(newKey)
      toast.success('MCP API Key generated successfully')
    } catch (error) {
      toast.error('Failed to generate key')
    } finally {
      setGenerating(false)
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
    if (text === apiKey) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const mcpUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/mcp?token=${apiKey || 'YOUR_KEY'}`
    : ''

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">MCP Server</h1>
            <Badge variant="secondary" className="bg-slate-100 text-slate-400 font-black text-[9px] uppercase px-2 h-5">Alpha 1.1</Badge>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">External AI Protocol • Multi-Tenant</p>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-50 p-12 md:p-16 text-center space-y-6 border border-slate-100 shadow-sm">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        
        <div className="inline-flex p-4 rounded-3xl bg-slate-900 text-white mb-4 shadow-xl">
          <Cpu className="w-10 h-10" />
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter leading-tight max-w-2xl mx-auto">
          Aegis for <span className="text-slate-400 underline decoration-slate-200 underline-offset-8 text-nowrap">External AI</span>
        </h2>
        <p className="text-slate-500 text-sm md:text-base max-w-xl mx-auto font-medium leading-relaxed">
          The Model Context Protocol (MCP) lets you securely connect your business data to any AI tool like Claude or ChatGPT.
        </p>
      </div>

      {/* API Key Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-black text-slate-900 uppercase tracking-tight">Your MCP API Key</CardTitle>
                  <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Private Access Token</CardDescription>
                </div>
                <Button 
                  onClick={handleGenerateKey} 
                  disabled={generating}
                  variant="outline"
                  className="rounded-xl border-slate-100 font-bold uppercase text-[10px] tracking-widest px-4 h-9"
                >
                  {generating ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RefreshCw className="w-3 h-3 mr-2" />}
                  {apiKey ? 'Regenerate' : 'Generate Key'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-4 space-y-4">
              <div className="relative group">
                <div className={`
                  flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-300
                  ${apiKey ? 'bg-slate-50 border-slate-100' : 'bg-slate-50/50 border-dashed border-slate-200'}
                `}>
                  <div className="flex-1 font-mono text-sm truncate">
                    {loading ? (
                      <span className="text-slate-300">Loading key...</span>
                    ) : !apiKey ? (
                      <span className="text-slate-400 italic">No key generated yet</span>
                    ) : (
                      <span className={showKey ? 'text-slate-900' : 'text-slate-300'}>
                        {showKey ? apiKey : '••••••••••••••••••••••••••••••••'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {apiKey && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8 text-slate-400 hover:text-slate-900"
                          onClick={() => setShowKey(!showKey)}
                        >
                          {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`w-8 h-8 transition-colors ${copied ? 'text-green-500' : 'text-slate-400 hover:text-slate-900'}`}
                          onClick={() => copyToClipboard(apiKey, 'API Key')}
                        >
                          {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide leading-relaxed">
                <Shield className="w-3 h-3 inline mr-1 mb-0.5" />
                KEEP THIS KEY PRIVATE. Anyone with this key can access your business data via MCP.
              </p>
            </CardContent>
          </Card>

          {/* Connection Tutorials */}
          <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-8 pb-0">
              <CardTitle className="font-black text-slate-900 uppercase tracking-tight">Setup Guides</CardTitle>
              <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Connect to your favorite AI</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-6">
              <Tabs defaultValue="claude" className="w-full">
                <TabsList className="bg-slate-50 p-1 rounded-2xl w-full justify-start overflow-x-auto no-scrollbar mb-6">
                  <TabsTrigger value="claude" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold uppercase text-[10px] px-6">Claude</TabsTrigger>
                  <TabsTrigger value="cursor" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold uppercase text-[10px] px-6">Cursor</TabsTrigger>
                  <TabsTrigger value="chatgpt" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold uppercase text-[10px] px-6">ChatGPT</TabsTrigger>
                  <TabsTrigger value="custom" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold uppercase text-[10px] px-6">Custom</TabsTrigger>
                </TabsList>
                
                <TabsContent value="claude" className="space-y-6 focus-visible:outline-none">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-900">
                      <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">1</div>
                      <p className="text-sm font-bold">Open your Claude Desktop config file</p>
                    </div>
                    <div className="bg-slate-900 rounded-2xl p-4 font-mono text-xs text-slate-300 space-y-2">
                      <p className="text-slate-500">// macOS</p>
                      <p>~/Library/Application Support/Claude/claude_desktop_config.json</p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-900">
                      <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">2</div>
                      <p className="text-sm font-bold">Add Aegis to "mcpServers" using Native SSE</p>
                    </div>
                    <div className="relative group">
                      <pre className="bg-slate-900 rounded-2xl p-6 font-mono text-xs text-slate-300 overflow-x-auto">
{`{
  "mcpServers": {
    "aegis-pos": {
      "url": "${mcpUrl}"
    }
  }
}`}
                      </pre>
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                        onClick={() => copyToClipboard(`{
  "mcpServers": {
    "aegis-pos": {
      "url": "${mcpUrl}"
    }
  }
}`, 'Config')}
                      >
                        <Copy size={12} />
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="cursor" className="space-y-6 focus-visible:outline-none">
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      Cursor IDE supports MCP natively via SSE. Follow these steps to connect:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50">
                        <Terminal className="w-4 h-4 text-slate-400 mt-1" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">Go to Cursor Settings</p>
                          <p className="text-xs text-slate-500 font-medium">Settings &gt; Features &gt; MCP</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50">
                        <Zap className="w-4 h-4 text-slate-400 mt-1" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">Add New MCP Server</p>
                          <p className="text-xs text-slate-500 font-medium">Name: Aegis POS • Type: <b>SSE</b></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50">
                        <Link2 className="w-4 h-4 text-slate-400" />
                        <div className="flex-1 truncate">
                          <p className="text-sm font-bold text-slate-900">Paste URL</p>
                          <p className="text-xs text-slate-500 font-medium truncate">{mcpUrl}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8 rounded-lg"
                          onClick={() => copyToClipboard(mcpUrl, 'Endpoint URL')}
                        >
                          <Copy size={12} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="chatgpt" className="space-y-6 focus-visible:outline-none">
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700">
                      <p className="text-xs font-bold uppercase tracking-tight mb-1">Coming Soon</p>
                      <p className="text-xs font-medium leading-relaxed">
                        ChatGPT does not support the raw MCP protocol yet. To use Aegis with ChatGPT, you need to create a **Custom GPT** and add an **Action** using an OpenAPI schema.
                      </p>
                    </div>
                    <Button variant="outline" className="w-full rounded-2xl h-12 font-bold text-xs gap-2 border-slate-200">
                      View OpenAPI Schema Guide <ExternalLink size={14} />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="custom" className="space-y-6 focus-visible:outline-none">
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-900">Direct SSE Connection</p>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      If you are building your own AI UI or using OpenRouter, connect directly via SSE:
                    </p>
                    <div className="bg-slate-900 rounded-2xl p-6 font-mono text-xs text-slate-300">
                      <p className="text-slate-500"># Connect via curl</p>
                      <p>curl -N "{mcpUrl}"</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Features */}
        <div className="space-y-6">
          <FeatureSidebarCard 
            icon={Link2}
            title="Standard Protocol"
            description="Built on Anthropic's Model Context Protocol for maximum compatibility."
          />
          <FeatureSidebarCard 
            icon={Shield}
            title="Encrypted Bridge"
            description="Your POS data is accessed via secure tokens and filtered by RLS."
          />
          <FeatureSidebarCard 
            icon={Zap}
            title="Real-time Stats"
            description="AI agents can query live sales data and inventory levels instantly."
          />
          
          <Card className="border-none bg-slate-900 rounded-3xl overflow-hidden shadow-xl text-white">
            <CardContent className="p-8 space-y-4 text-center">
              <div className="p-4 bg-white/10 rounded-3xl w-fit mx-auto">
                <Network className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-black uppercase tracking-tight text-sm">Active Transport</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">SSE (Server-Sent Events)</p>
              </div>
              <div className="pt-4 flex items-center justify-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Cloud Ready 24/7</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function FeatureSidebarCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="p-6 rounded-3xl border border-slate-100 bg-white hover:border-slate-300 transition-all group">
      <div className="flex gap-4">
        <div className="p-3 bg-slate-50 rounded-2xl w-fit group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
          <Icon size={18} />
        </div>
        <div className="space-y-1">
          <h3 className="font-black text-slate-900 uppercase tracking-tight text-[11px]">{title}</h3>
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  )
}
