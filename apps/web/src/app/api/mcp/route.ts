import { NextRequest, NextResponse } from 'next/server'
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema,
  InitializeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { 
  queryOrders, 
  queryProducts, 
  queryMembers, 
  queryStats, 
  queryRawMaterials,
  createProduct,
  updateProduct,
  createRawMaterial,
  updateRawMaterial,
  addProductMaterial,
  syncProductHpp,
  createOrder,
  deleteOrder,
  ToolParams 
} from '@/lib/ai/tools-logic'
import { supabaseAdmin } from '@/lib/supabase'
import { nanoid } from 'nanoid'

/**
 * MCP Multi-Tenant Server - Version 1.6.5
 * Optimized for Vercel Serverless (Resilient SSE)
 */

// Use global for local development stability, 
// though on Vercel this will be per-instance.
const sessions = new Map<string, { 
  server: any, 
  controller: ReadableStreamDefaultController,
  businessId: string 
}>()

function createMcpServer() {
  return new Server(
    { name: "aegis-mcp-server", version: "1.6.5" },
    { capabilities: { tools: {} } }
  )
}

function setupHandlers(server: any, businessId: string) {
  server.setRequestHandler(InitializeRequestSchema, async () => ({
    protocolVersion: "2025-11-25",
    capabilities: { tools: {} },
    serverInfo: { name: "aegis-mcp-server", version: "1.6.5" },
  }))

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      { name: "query_orders", description: "Cek transaksi terbaru", inputSchema: { type: "object", properties: { date: { type: "string" } } } },
      { name: "query_products", description: "Cek stok/harga produk", inputSchema: { type: "object", properties: { search: { type: "string" } } } },
      { name: "query_stats", description: "Statistik performa bisnis", inputSchema: { type: "object", properties: { period: { type: "string" } } } },
      { name: "create_order", description: "Catat penjualan baru", inputSchema: { type: "object", required: ["total", "items"], properties: { total: { type: "number" }, items: { type: "array", items: { type: "object" } } } } },
      { name: "sync_product_hpp", description: "Update modal (HPP) otomatis", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } } }
    ]
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params
    try {
      let result: any
      switch (name) {
        case 'query_orders': result = await queryOrders(businessId, args); break
        case 'query_products': result = await queryProducts(businessId, args); break
        case 'query_stats': result = await queryStats(businessId, args); break
        case 'create_order': result = await createOrder(businessId, args); break
        case 'sync_product_hpp': result = await syncProductHpp(businessId, args); break
        default: result = { error: "Unknown tool" }
      }
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }
    } catch (e: any) {
      return { isError: true, content: [{ type: "text", text: e.message }] }
    }
  })
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return new Response('Missing token', { status: 401 })

  const { data: keyData } = await supabaseAdmin
    .from('mcp_api_keys').select('business_id').eq('token', token).eq('is_active', true).single()

  const businessId = keyData?.business_id || process.env.TEST_BUSINESS_ID || "0000"
  const sessionId = nanoid()

  const stream = new ReadableStream({
    async start(controller) {
      const server: any = createMcpServer()
      setupHandlers(server, businessId)
      
      server.transport = {
        send: async (msg: any) => {
          try { controller.enqueue(`event: message\ndata: ${JSON.stringify(msg)}\n\n`) } catch (e) {}
        }
      }

      sessions.set(sessionId, { server, controller, businessId })
      
      const postUrl = new URL(req.url)
      postUrl.searchParams.set('sessionId', sessionId)
      controller.enqueue(`event: endpoint\ndata: ${postUrl.toString()}\n\n`)

      // Heartbeat to prevent Vercel timeout
      const interval = setInterval(() => {
        try { controller.enqueue(': heartbeat\n\n') } catch (e) { clearInterval(interval) }
      }, 10000)

      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        sessions.delete(sessionId)
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}

export async function POST(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  const session = sessionId ? sessions.get(sessionId) : null

  // If session lost in serverless, try to gracefully notify client or ignore
  if (!session) return new Response('Session Lost', { status: 202 }) // Accepted but session gone

  try {
    const message = await req.json()
    await session.server.handleMessage(message)
    return new Response('OK', { status: 200 })
  } catch (e) {
    return new Response('Error', { status: 500 })
  }
}
