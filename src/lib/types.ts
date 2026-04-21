export interface Product {
  id: string
  name: string
  price: number
  hpp: number
  stock: number
  category: string
  image_url?: string | null
  created_at: string
}

export interface Order {
  id: string
  total: number
  payment_method: string
  payment_provider?: string | null
  payment_proof_url?: string | null
  payment_proof_path?: string | null
  payment_proof_uploaded_at?: string | null
  payment_notes?: string | null
  created_at: string
  member_id?: string
  points_earned?: number
  points_used?: number
  discount?: number
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  qty: number
  price: number
  cost_price: number
  product?: Product
}

export interface User {
  id: string
  name: string
  email: string
  role: string
  created_at: string
}

export interface CartItem {
  product: Product
  qty: number
}

export interface DashboardStats {
  totalSalesToday: number
  totalOrdersToday: number
  totalProducts: number
  topProducts: Product[]
}

export interface StoreSettings {
  store_name: string
  store_address: string
  store_phone: string
  store_email: string
  store_tax_id: string
  receipt_footer: string
  receipt_paper_size: '58mm' | '80mm'
}

export interface Member {
  id: string
  name: string
  phone: string
  email?: string
  points: number
  total_purchases: number
  created_at: string
  updated_at: string
}
