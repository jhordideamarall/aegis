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
import { z } from 'zod'

/**
 * MCP Multi-Tenant Server implementation for Next.js App Router
 * Version 1.6.0 - Following "MCP Server Development Guide" Best Practices:
 * - Zod Validation
 * - Structured Content
 * - Annotations (Read-only / Destructive)
 */

const sessions = new Map<string, { 
  server: any, 
  controller: ReadableStreamDefaultController,
  businessId: string 
}>()

function createMcpServer() {
  return new Server(
    { name: "aegis-mcp-server", version: "1.6.0" },
    { capabilities: { tools: {} } }
  )
}

function setupHandlers(server: any, businessId: string) {
  server.setRequestHandler(InitializeRequestSchema, async () => {
    return {
      protocolVersion: "2025-11-25",
      capabilities: { tools: {} },
      serverInfo: { name: "aegis-mcp-server", version: "1.6.0" },
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
          },
          annotations: { readOnlyHint: true }
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
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "query_raw_materials",
          description: "Cari data bahan baku (raw materials) dan stoknya",
          inputSchema: {
            type: "object",
            properties: {
              search: { type: "string", description: "Nama bahan baku" }
            }
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "query_members",
          description: "Cari data member dan poin loyalitas",
          inputSchema: {
            type: "object",
            properties: {
              search: { type: "string", description: "Nama atau nomor HP member" }
            }
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "query_stats",
          description: "Ambil statistik performa bisnis (revenue, profit, top products)",
          inputSchema: {
            type: "object",
            properties: {
              period: { type: "string", description: "today | yesterday | week | month | year" }
            }
          },
          annotations: { readOnlyHint: true }
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
          description: "Tambah bahan baku baru (misal: Biji Kopi, Gula, Susu)",
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
          description: "Hubungkan produk dengan bahan baku (Resep). Otomatis update HPP produk.",
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
          description: "Hitung ulang HPP produk berdasarkan harga bahan baku terbaru",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string" }
            },
            required: ["id"]
          },
          annotations: { idempotentHint: true }
        },
        {
          name: "create_order",
          description: "Catat transaksi penjualan baru (Otomatis potong stok produk & bahan baku)",
          inputSchema: {
            type: "object",
            properties: {
              total: { type: "number" },
              payment_method: { type: "string" },
              member_id: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    product_id: { type: "string" },
                    qty: { type: "number" },
                    price: { type: "number" }
                  }
                }
              }
            },
            required: ["total", "payment_method", "items"]
          }
        },
        {
          name: "delete_order",
          description: "Hapus data transaksi",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "UUID Order" }
            },
            required: ["id"]
          },
          annotations: { destructiveHint: true }
        }
      ]
    }
  })

  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params
    let result: unknown

    try {
      // 1. Zod Validation (Standard Pattern)
      const schemaMap: Record<string, z.ZodSchema> = {
        'query_orders': z.object({ date: z.string().optional(), limit: z.number().optional() }),
        'query_products': z.object({ search: z.string().optional(), category: z.string().optional(), lowStock: z.boolean().optional() }),
        'delete_order': z.object({ id: z.string() }),
        'sync_product_hpp': z.object({ id: z.string() }),
        // ... extend schemas as needed
      }

      if (schemaMap[name]) {
        schemaMap[name].parse(args)
      }

      // 2. Execution
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

      // 3. Structured Content Response (Best Practice Phase 2.3)
      return {
        content: [
          { type: "text", text: `Success: Executed ${name}` },
          { type: "text", text: JSON.stringify(result, null, 2) }
        ],
        _meta: { result } // Allow advanced clients to process structured data
      }
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error.message}${error.errors ? ' - ' + JSON.stringify(error.errors) : ''}` }]
      }
    }
  })
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return new Response('Unauthorized: Missing token', { status: 401 })

  try {
    const { data: keyData, error } = await supabaseAdmin
      .from('mcp_api_keys').select('business_id').eq('token', token).eq('is_active', true).single()

    if (error || !keyData) {
      const globalSecret = process.env.AEGIS_MCP_SECRET_KEY
      if (!globalSecret || token !== globalSecret) return new Response('Unauthorized: Invalid token', { status: 401 })
    }

    const businessId = keyData?.business_id || process.env.TEST_BUSINESS_ID || "00000000-0000-0000-0000-000000000000"
    const sessionId = nanoid()

    const stream = new ReadableStream({
      async start(controller) {
        const server: any = createMcpServer()
        setupHandlers(server, businessId)
        
        const transport = {
          onClose: undefined,
          onMessage: undefined,
          start: async () => {},
          send: async (message: any) => {
            controller.enqueue(`event: message\ndata: ${JSON.stringify(message)}\n\n`)
          },
          close: async () => {}
        }

        await server.connect(transport)
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
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err: any) {
    return new Response(`Error: ${err.message}`, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  const session = sessionId ? sessions.get(sessionId) : null
  if (!session) return NextResponse.json({ error: "Session not found or expired" }, { status: 400 })

  try {
    const message = await req.json()
    await session.server.handleMessage(message)
    return new Response('OK', { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
