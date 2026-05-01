import { supabaseAdmin } from '@/lib/supabase'
import { getCachedStats, Stats } from '@/lib/ai-stats-cache'

export interface ToolParams {
  date?: string
  startDate?: string
  endDate?: string
  limit?: number
  category?: string
  search?: string
  lowStock?: boolean
  period?: string
  
  // Create/Update/Delete params
  id?: string
  productId?: string
  materialId?: string
  name?: string
  price?: number
  stock?: number
  phone?: string
  points?: number
  costPerUnit?: number
  unit?: string
  qtyNeeded?: number
}

export function parseDate(dateStr: string): { start: Date; end: Date } | null {
  const now = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)

  switch (dateStr) {
    case 'today':
      return { start: today, end: now }
    case 'yesterday':
      const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1); yesterday.setHours(0, 0, 0, 0)
      const yesterdayEnd = new Date(yesterday); yesterdayEnd.setHours(23, 59, 59, 999)
      return { start: yesterday, end: yesterdayEnd }
    case 'last-7-days':
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
      return { start: weekAgo, end: now }
    default:
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number)
        const start = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+08:00`)
        const end = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59+08:00`)
        if (!isNaN(start.getTime())) {
          return { start, end }
        }
      }
  }
  return null
}

/**
 * QUERIES (READ)
 */

export async function queryOrders(businessId: string, params: ToolParams) {
  let query = supabaseAdmin
    .from('orders')
    .select('id, total, tax_amount, service_amount, created_at, payment_method, member:members(name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (params.date) {
    const range = parseDate(params.date)
    if (range) {
      query = query.gte('created_at', range.start.toISOString()).lte('created_at', range.end.toISOString())
    }
  }

  const limit = params.limit || 50
  const { data: orders, error } = await query.limit(limit)

  if (error) throw new Error(error.message)

  const totalRevenue = (orders || []).reduce((s, o) => s + Number(o.total), 0)
  
  return {
    count: orders?.length || 0,
    revenue: totalRevenue,
    orders: orders?.slice(0, 10).map(o => ({
      id: o.id,
      total: Number(o.total),
      created_at: o.created_at,
      payment_method: o.payment_method,
      member: (o.member as any)?.name || 'Umum'
    })) || []
  }
}

export async function queryProducts(businessId: string, params: ToolParams) {
  let query = supabaseAdmin
    .from('products')
    .select('id, name, price, stock, category, hpp, auto_calculated_hpp')
    .eq('business_id', businessId)
    .order('name')

  if (params.category) query = query.ilike('category', `%${params.category}%`)
  if (params.search) query = query.ilike('name', `%${params.search}%`)
  if (params.lowStock) query = query.lte('stock', 5)

  const { data: products, error } = await query.limit(100)
  if (error) throw new Error(error.message)

  return {
    total: products?.length || 0,
    products: products?.map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      stock: p.stock,
      category: p.category,
      hpp: p.hpp,
      autoHpp: p.auto_calculated_hpp
    })) || []
  }
}

export async function queryMembers(businessId: string, params: ToolParams) {
  let query = supabaseAdmin
    .from('members')
    .select('id, name, phone, points, total_purchases')
    .eq('business_id', businessId)
    .order('total_purchases', { ascending: false })

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,phone.ilike.%${params.search}%`)
  }

  const { data: members, error } = await query.limit(100)
  if (error) throw new Error(error.message)

  return {
    total: members?.length || 0,
    members: members?.map(m => ({
      id: m.id,
      name: m.name,
      phone: m.phone,
      points: m.points,
      total_purchases: Number(m.total_purchases)
    })) || []
  }
}

export async function queryRawMaterials(businessId: string, params: ToolParams) {
  let query = supabaseAdmin
    .from('raw_materials')
    .select('id, name, cost_per_unit, unit, stock')
    .eq('business_id', businessId)
    .order('name')

  if (params.search) query = query.ilike('name', `%${params.search}%`)

  const { data, error } = await query.limit(100)
  if (error) throw new Error(error.message)

  return data
}

export async function queryStats(businessId: string, params: ToolParams) {
  const period = params.period || 'today'
  const cached = await getCachedStats(businessId)

  const isCustomDate = /^\d{4}-\d{2}-\d{2}$/.test(period)
  const isMonth = /^\d{4}-\d{2}$/.test(period)
  const isLast7Days = period === 'last-7-days'
  
  let stats: Stats = cached.today
  let productBreakdown: Array<{ name: string; qty: number; revenue: number }> = []
  let hourlyBreakdown: Array<{ hour: string; count: number; revenue: number }> = []
  
  if (isCustomDate || isMonth) {
    let startDate: Date, endDate: Date
    
    if (isMonth) {
      const [year, month] = period.split('-').map(Number)
      const startStr = `${year}-${String(month).padStart(2, '0')}-01T00:00:00+08:00`
      const lastDay = new Date(year, month, 0).getDate()
      const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59+08:00`
      startDate = new Date(startStr)
      endDate = new Date(endStr)
    } else {
      const range = parseDate(period)
      if (!range) { startDate = cached.today as unknown as Date; endDate = startDate }
      else { startDate = range.start; endDate = range.end }
    }

    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id, total, tax_amount, service_amount, created_at')
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .limit(1000000)
    
    const revenue = (orders || []).reduce((s, o) => s + Number(o.total), 0)
    const tax = (orders || []).reduce((s, o) => s + Number(o.tax_amount || 0), 0)
    const service = (orders || []).reduce((s, o) => s + Number(o.service_amount || 0), 0)
    const net_revenue = revenue - tax - service
    
    stats = { count: orders?.length || 0, revenue, net_revenue, profit: net_revenue }
    
    if (orders?.length) {
      const orderIds = orders.map(o => o.id)
      const { data: items } = await supabaseAdmin.from('order_items').select('qty, price, product_id').in('order_id', orderIds)
      const { data: prods } = await supabaseAdmin.from('products').select('id, name')
      const prodNameMap = new Map((prods || []).map(p => [p.id, p.name]))
      const prodMap = new Map<string, { qty: number; revenue: number }>()
      
      for (const item of (items || [])) {
        const itemTyped = item as { product_id: string; qty: number; price: number }
        const prodName = prodNameMap.get(itemTyped.product_id) || 'Unknown'
        const existing = prodMap.get(prodName) || { qty: 0, revenue: 0 }
        prodMap.set(prodName, { qty: existing.qty + itemTyped.qty, revenue: existing.revenue + (Number(itemTyped.price) * itemTyped.qty) })
      }
      
      productBreakdown = Array.from(prodMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
      
      const hourMap = new Map<number, { count: number; revenue: number }>()
      for (const order of orders) {
        const hour = new Date(order.created_at).getHours()
        const existing = hourMap.get(hour) || { count: 0, revenue: 0 }
        hourMap.set(hour, { count: existing.count + 1, revenue: existing.revenue + Number(order.total) })
      }
      hourlyBreakdown = Array.from(hourMap.entries())
        .map(([hour, data]) => ({ hour: `${hour}:00`, count: data.count, revenue: data.revenue }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    }
  } else if (isLast7Days) {
    const now = new Date()
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7); weekAgo.setHours(0, 0, 0, 0)
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id, total, tax_amount, service_amount')
      .eq('business_id', businessId)
      .gte('created_at', weekAgo.toISOString())
      .lte('created_at', now.toISOString())
      .limit(1000000)
    
    const revenue = (orders || []).reduce((s, o) => s + Number(o.total), 0)
    const tax = (orders || []).reduce((s, o) => s + Number(o.tax_amount || 0), 0)
    const service = (orders || []).reduce((s, o) => s + Number(o.service_amount || 0), 0)
    stats = { count: orders?.length || 0, revenue, net_revenue: revenue - tax - service, profit: revenue - tax - service }
  } else {
    const statsMap: Record<string, Stats> = { today: cached.today, yesterday: cached.yesterday, week: cached.week, month: cached.month, year: cached.year }
    stats = statsMap[period] || cached.today
  }

  const fmt = (n: number) => `Rp${n.toLocaleString('id-ID')}`

  return {
    period,
    count: stats.count,
    revenue: stats.revenue,
    net_revenue: stats.net_revenue,
    profit: stats.profit,
    formatted: `${stats.count} order | ${fmt(stats.revenue)} revenue | ${fmt(stats.net_revenue)} net`,
    productBreakdown: productBreakdown.length ? productBreakdown : null,
    hourlyBreakdown: hourlyBreakdown.length ? hourlyBreakdown : null
  }
}

/**
 * WRITE OPERATIONS (CREATE, UPDATE, DELETE)
 */

export async function createProduct(businessId: string, params: ToolParams) {
  if (!params.name || params.price === undefined) throw new Error('Name and Price are required')
  const { data, error } = await supabaseAdmin
    .from('products')
    .insert([{ business_id: businessId, name: params.name, price: params.price, stock: params.stock || 0, category: params.category || '' }])
    .select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateProduct(businessId: string, params: ToolParams) {
  if (!params.id) throw new Error('Product ID is required')
  const updates: any = { updated_at: new Date().toISOString() }
  if (params.name !== undefined) updates.name = params.name
  if (params.price !== undefined) updates.price = params.price
  if (params.stock !== undefined) updates.stock = params.stock
  if (params.category !== undefined) updates.category = params.category
  const { data, error } = await supabaseAdmin.from('products').update(updates).eq('id', params.id).eq('business_id', businessId).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function createRawMaterial(businessId: string, params: ToolParams) {
  if (!params.name || params.costPerUnit === undefined) throw new Error('Name and Cost per Unit are required')
  const { data, error } = await supabaseAdmin
    .from('raw_materials')
    .insert([{ business_id: businessId, name: params.name, cost_per_unit: params.costPerUnit, unit: params.unit || 'pcs', stock: params.stock || 0 }])
    .select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateRawMaterial(businessId: string, params: ToolParams) {
  if (!params.id) throw new Error('Material ID is required')
  const updates: any = { updated_at: new Date().toISOString() }
  if (params.name !== undefined) updates.name = params.name
  if (params.costPerUnit !== undefined) updates.cost_per_unit = params.costPerUnit
  if (params.unit !== undefined) updates.unit = params.unit
  if (params.stock !== undefined) updates.stock = params.stock
  const { data, error } = await supabaseAdmin.from('raw_materials').update(updates).eq('id', params.id).eq('business_id', businessId).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function addProductMaterial(businessId: string, params: ToolParams) {
  if (!params.productId || !params.materialId || !params.qtyNeeded) throw new Error('productId, materialId, and qtyNeeded are required')
  const { data, error } = await supabaseAdmin
    .from('product_materials')
    .insert([{ business_id: businessId, product_id: params.productId, material_id: params.materialId, qty_needed: params.qtyNeeded }])
    .select().single()
  if (error) throw new Error(error.message)
  
  // Recalculate HPP automatically
  await syncProductHpp(businessId, { id: params.productId })
  return data
}

/**
 * HPP LOGIC
 */

export async function syncProductHpp(businessId: string, params: ToolParams) {
  if (!params.id) throw new Error('Product ID is required')

  // 1. Get all materials for this product
  const { data: mappings, error: mapError } = await supabaseAdmin
    .from('product_materials')
    .select('qty_needed, raw_materials(cost_per_unit)')
    .eq('product_id', params.id)
    .eq('business_id', businessId)
    .eq('is_active', true)

  if (mapError) throw new Error(mapError.message)

  // 2. Calculate HPP
  let calculatedHpp = 0
  if (mappings && mappings.length > 0) {
    calculatedHpp = mappings.reduce((total: number, m: any) => {
      const rawMaterial = Array.isArray(m.raw_materials) ? m.raw_materials[0] : m.raw_materials
      if (!rawMaterial) return total
      return total + ((m.qty_needed || 0) * (rawMaterial.cost_per_unit || 0))
    }, 0)
  }

  // 3. Update product
  const { data, error } = await supabaseAdmin
    .from('products')
    .update({ 
      auto_calculated_hpp: calculatedHpp,
      hpp: calculatedHpp > 0 ? calculatedHpp : undefined, // Only update hpp if we have materials
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id)
    .eq('business_id', businessId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return { 
    id: params.id, 
    oldHpp: data.hpp, 
    newCalculatedHpp: calculatedHpp,
    status: 'HPP Updated successfully'
  }
}

/**
 * ORDER CRUD
 */

export async function createOrder(businessId: string, params: any) {
  const {
    total,
    payment_method,
    items,
    member_id,
    points_earned = 0,
    points_used = 0,
    tax_amount = 0,
    service_amount = 0
  } = params

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Order items are required')
  }

  // 1. Create the order
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert([{
      business_id: businessId,
      total,
      payment_method,
      member_id: member_id || null,
      points_earned,
      points_used,
      tax_amount,
      service_amount
    }])
    .select()
    .single()

  if (orderError) throw new Error(orderError.message)

  // 2. Create order items and update product stock
  for (const item of items) {
    // Get current product info for HPP and current stock
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('stock, hpp')
      .eq('id', item.product_id)
      .eq('business_id', businessId)
      .single()

    if (!product) continue

    // Insert order item
    await supabaseAdmin.from('order_items').insert([{
      order_id: order.id,
      product_id: item.product_id,
      qty: item.qty,
      price: item.price,
      cost_price: product.hpp || 0,
      business_id: businessId
    }])

    // Update product stock
    await supabaseAdmin
      .from('products')
      .update({ stock: product.stock - item.qty })
      .eq('id', item.product_id)
      .eq('business_id', businessId)

    // 3. Decrement Raw Materials (Recipe Logic)
    const { data: mappings } = await supabaseAdmin
      .from('product_materials')
      .select('material_id, qty_needed, raw_materials(stock)')
      .eq('product_id', item.product_id)
      .eq('business_id', businessId)
      .eq('is_active', true)

    if (mappings && mappings.length > 0) {
      for (const mapping of mappings) {
        const rawMaterial = Array.isArray(mapping.raw_materials) ? mapping.raw_materials[0] : mapping.raw_materials
        if (rawMaterial) {
          await supabaseAdmin
            .from('raw_materials')
            .update({ stock: (rawMaterial.stock || 0) - (mapping.qty_needed * item.qty) })
            .eq('id', mapping.material_id)
            .eq('business_id', businessId)
        }
      }
    }
  }

  // 4. Update member points
  if (member_id) {
    const { data: member } = await supabaseAdmin
      .from('members')
      .select('points, total_purchases')
      .eq('id', member_id)
      .eq('business_id', businessId)
      .single()

    if (member) {
      await supabaseAdmin
        .from('members')
        .update({
          points: member.points + points_earned - points_used,
          total_purchases: member.total_purchases + total
        })
        .eq('id', member_id)
        .eq('business_id', businessId)
      
      // Add transaction logs
      if (points_earned > 0) {
        await supabaseAdmin.from('member_transactions').insert([{
          member_id, order_id: order.id, type: 'earn', points: points_earned, description: 'Earned from AI Order'
        }])
      }
      if (points_used > 0) {
        await supabaseAdmin.from('member_transactions').insert([{
          member_id, order_id: order.id, type: 'redeem', points: -points_used, description: 'Used in AI Order'
        }])
      }
    }
  }

  return { success: true, order_id: order.id, total: order.total }
}

export async function deleteOrder(businessId: string, params: { id: string }) {
  if (!params.id) throw new Error('Order ID is required')
  
  const { error } = await supabaseAdmin
    .from('orders')
    .delete()
    .eq('id', params.id)
    .eq('business_id', businessId)

  if (error) throw new Error(error.message)
  return { success: true, message: `Order ${params.id} deleted` }
}

