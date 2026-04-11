import { NextResponse } from 'next/server'
import { getAdminUserFromRequest } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminUser = await getAdminUserFromRequest(request)

    if (!adminUser) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body
    const allowedStatuses = new Set(['active', 'demo', 'suspended'])

    if (!status || !allowedStatuses.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('businesses')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    // Log internally for debugging (use structured logging service in production)
    // Don't expose internal error details to client
    return NextResponse.json(
      { error: 'Failed to update business' },
      { status: 500 }
    )
  }
}
