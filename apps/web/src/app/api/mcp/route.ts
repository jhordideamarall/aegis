import { NextRequest, NextResponse } from 'next/server'
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema,
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

/**
 * MCP Multi-Tenant Server implementation
 */

const createMcpServer = () => {
  return new Server(
    {
      name: "aegis-mcp-server",
      version: "1.3.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )
}

/**
 * Tool Definitions
 */
const setupHandlers = (server: Server, businessId: string) => {
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
          description: "Tambah bahan baku baru (misal: Biji Kopi, Gula, Susu)",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string" },
              costPerUnit: { type: "number", description: "Harga beli per unit" },
              unit: { type: "string", description: "pcs | gram | ml | kg | liter" },
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
              id: { type: "string", description: "UUID Bahan Baku" },
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
              qtyNeeded: { type: "number", description: "Jumlah bahan yang digunakan per 1 porsi produk" }
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
              id: { type: "string", description: "UUID Produk" }
            },
            required: ["id"]
          }
        },
        {
          name: "create_order",
          description: "Catat transaksi penjualan baru (Otomatis potong stok produk & bahan baku)",
          inputSchema: {
            type: "object",
            properties: {
              total: { type: "number" },
              payment_method: { type: "string", description: "cash | qris | transfer" },
              member_id: { type: "string", description: "UUID Member (opsional)" },
              points_earned: { type: "number" },
              points_used: { type: "number" },
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

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      }
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error executing ${name}: ${error.message}` }]
      }
    }
  })
}

// Map to store active transports in memory (limited lifetime in serverless)
const transports = new Map<string, SSEServerTransport>()

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  
  if (!token) {
    return new Response('Unauthorized: Missing token', { status: 401 })
  }

  // 1. Validate token and get business_id
  const { data: keyData, error } = await supabaseAdmin
    .from('mcp_api_keys')
    .select('business_id')
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (error || !keyData) {
    // Fallback for global secret key during transition or for internal testing
    const globalSecret = process.env.AEGIS_MCP_SECRET_KEY
    if (!globalSecret || token !== globalSecret) {
      return new Response('Unauthorized: Invalid token', { status: 401 })
    }
  }

  const businessId = keyData?.business_id || process.env.TEST_BUSINESS_ID || "00000000-0000-0000-0000-000000000000"

  // 2. Initialize MCP Server for this session
  const server = createMcpServer()
  setupHandlers(server, businessId)

  // 3. Create transport
  const transport = new SSEServerTransport("/api/mcp", req as any)
  
  // Update last_used_at
  if (keyData) {
    await supabaseAdmin
      .from('mcp_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token', token)
  }

  // Connect server to transport
  await server.connect(transport)

  // In a real serverless env, we need a way to correlate the POST messages.
  // The SDK uses a sessionId in the URL for the POST requests.
  // We need to keep the transport available for the subsequent POSTs.
  const sessionId = (transport as any).sessionId
  if (sessionId) {
    transports.set(sessionId, transport)
    // Optional: Cleanup old transports after some time
    setTimeout(() => transports.delete(sessionId), 3600000) // 1 hour
  }

  return (transport as any).handle(req)
}

export async function POST(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  const transport = sessionId ? transports.get(sessionId) : null

  if (!transport) {
    return NextResponse.json({ error: "Session not found or expired" }, { status: 400 })
  }
  
  return (transport as any).handle(req)
}
