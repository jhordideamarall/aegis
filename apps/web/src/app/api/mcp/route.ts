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
 * MCP Multi-Tenant Server implementation for Next.js App Router
 * Fixed for Vercel Build & Stability
 */

// Define a simple transport interface for our manual streaming
interface Transport {
  send(message: any): Promise<void>;
  onClose?: () => void;
  onMessage?: (message: any) => void;
}

const sessions = new Map<string, { 
  server: Server, 
  controller: ReadableStreamDefaultController,
  businessId: string 
}>()

const createMcpServer = () => {
  return new Server(
    { name: "aegis-mcp-server", version: "1.4.2" },
    { capabilities: { tools: {} } }
  )
}

const setupHandlers = (server: Server, businessId: string) => {
  server.setRequestHandler(InitializeRequestSchema, async () => {
    return {
      protocolVersion: "2025-11-25",
      capabilities: { tools: {} },
      serverInfo: { name: "aegis-mcp-server", version: "1.4.2" },
    }
  })

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "query_orders",
          description: "Ambil data transaksi/pesanan terbaru dari Aegis POS",
          inputSchema: {
            type: "object",
            properties: {
              date: { type: "string", description: "today | yesterday | YYYY-MM-DD | last-7-days" },
              limit: { type: "number", description: "Maksimal data yang diambil (default 50)" }
            }
          }
        },
        {
          name: "query_products",
          description: "Cari data produk, stok, dan harga",
          inputSchema: {
            type: "object",
            properties: {
              search: { type: "string", description: "Nama produk" },
              category: { type: "string", description: "Kategori produk" },
              lowStock: { type: "boolean", description: "Filter produk dengan stok menipis (<= 5)" }
            }
          }
        },
        {
          name: "query_raw_materials",
          description: "Cari data bahan baku (raw materials) dan stoknya",
          inputSchema: {
            type: "object",
            properties: {
              search: { type: "string", description: "Nama bahan baku" }
            }
          }
        },
        {
          name: "query_members",
          description: "Cari data member dan poin loyalitas",
          inputSchema: {
            type: "object",
            properties: {
              search: { type: "string", description: "Nama atau nomor HP member" }
            }
          }
        },
        {
          name: "query_stats",
          description: "Ambil statistik performa bisnis (revenue, profit, top products)",
          inputSchema: {
            type: "object",
            properties: {
              period: { type: "string", description: "today | yesterday | week | month | year" }
            }
          }
        },
        {
          name: "create_product",
          description: "Tambah produk baru ke katalog",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string" },
              price: { type: "number" },
              stock: { type: "number" },
              category: { type: "string" }
            },
            required: ["name", "price"]
          }
        },
        {
          name: "update_product",
          description: "Update data produk (harga, stok, nama)",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "UUID Produk" },
              name: { type: "string" },
              price: { type: "number" },
              stock: { type: "number" }
            },
            required: ["id"]
          }
        },
        {
          name: "create_raw_material",
          description: "Tambah bahan baku baru",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string" },
              costPerUnit: { type: "number" },
              unit: { type: "string" },
              stock: { type: "number" }
            },
            required: ["name", "costPerUnit"]
          }
        },
        {
          name: "update_raw_material",
          description: "Update stok atau harga beli bahan baku",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              costPerUnit: { type: "number" },
              stock: { type: "number" }
            },
            required: ["id"]
          }
        },
        {
          name: "add_product_material",
          description: "Hubungkan produk dengan bahan baku (Resep)",
          inputSchema: {
            type: "object",
            properties: {
              productId: { type: "string" },
              materialId: { type: "string" },
              qtyNeeded: { type: "number" }
            },
            required: ["productId", "materialId", "qtyNeeded"]
          }
        },
        {
          name: "sync_product_hpp",
          description: "Hitung ulang HPP produk",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string" }
            },
            required: ["id"]
          }
        },
        {
          name: "create_order",
          description: "Catat transaksi penjualan baru",
          inputSchema: {
            type: "object",
            properties: {
              total: { type: "number" },
              payment_method: { type: "string" },
              member_id: { type: "string" },
              items: { type: "array", items: { type: "object" } }
            },
            required: ["total", "payment_method", "items"]
          }
        }
      ]
    }
  })

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    let result: unknown
    try {
      switch (name) {
        case 'query_orders': result = await queryOrders(businessId, args as ToolParams); break
        case 'query_products': result = await queryProducts(businessId, args as ToolParams); break
        case 'query_members': result = await queryMembers(businessId, args as ToolParams); break
        case 'query_stats': result = await queryStats(businessId, args as ToolParams); break
        case 'query_raw_materials': result = await queryRawMaterials(businessId, args as ToolParams); break
        case 'create_product': result = await createProduct(businessId, args as ToolParams); break
        case 'update_product': result = await updateProduct(businessId, args as ToolParams); break
        case 'create_raw_material': result = await createRawMaterial(businessId, args as ToolParams); break
        case 'update_raw_material': result = await updateRawMaterial(businessId, args as ToolParams); break
        case 'add_product_material': result = await addProductMaterial(businessId, args as ToolParams); break
        case 'sync_product_hpp': result = await syncProductHpp(businessId, args as ToolParams); break
        case 'create_order': result = await createOrder(businessId, args); break
        case 'delete_order': result = await deleteOrder(businessId, args as { id: string }); break
        default: throw new Error(`Unknown tool: ${name}`)
      }
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }
    } catch (error: any) {
      return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] }
    }
  })
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return new Response('Missing token', { status: 401 })

  try {
    const { data: keyData, error } = await supabaseAdmin
      .from('mcp_api_keys').select('business_id').eq('token', token).eq('is_active', true).single()

    if (error || !keyData) {
      const globalSecret = process.env.AEGIS_MCP_SECRET_KEY
      if (!globalSecret || token !== globalSecret) return new Response('Invalid token', { status: 401 })
    }

    const businessId = keyData?.business_id || process.env.TEST_BUSINESS_ID || "00000000-0000-0000-0000-000000000000"
    const sessionId = nanoid()

    const stream = new ReadableStream({
      start(controller) {
        const server = createMcpServer()
        setupHandlers(server, businessId)
        
        // Connect the server to our manual stream-based transport
        // MCP Server uses transport.send to send messages back to client
        (server as any).transport = {
          send: async (message: any) => {
            controller.enqueue(`event: message\ndata: ${JSON.stringify(message)}\n\n`)
          }
        }

        sessions.set(sessionId, { server, controller, businessId })
        
        const postUrl = new URL(req.url)
        postUrl.searchParams.set('sessionId', sessionId)
        controller.enqueue(`event: endpoint\ndata: ${postUrl.toString()}\n\n`)

        const heartbeat = setInterval(() => {
          try { controller.enqueue(': heartbeat\n\n') } catch { clearInterval(heartbeat) }
        }, 15000)

        req.signal.addEventListener('abort', () => {
          clearInterval(heartbeat)
          sessions.delete(sessionId)
        })
      },
      cancel() { sessions.delete(sessionId) }
    })

    if (keyData) {
      supabaseAdmin.from('mcp_api_keys').update({ last_used_at: new Date().toISOString() }).eq('token', token).then(() => {})
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    })
  } catch (err: any) {
    return new Response(`Error: ${err.message}`, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  const session = sessionId ? sessions.get(sessionId) : null
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 400 })

  try {
    const message = await req.json()
    // Use handleMessage with any cast to bypass TypeScript property check while keeping SDK logic
    await (session.server as any).handleMessage(message)
    return new Response('OK', { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
