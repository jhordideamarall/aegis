import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { assertBusinessActive } from '@/lib/business'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('business_id')

    if (!businessId) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('*')
      .eq('business_id', businessId)

    if (error) throw error

    // Convert to key-value object
    const settings: Record<string, string> = {}
    data?.forEach(item => {
      settings[item.key] = item.value
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { settings, business_id } = body

    if (!business_id) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      )
    }

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid settings format' },
        { status: 400 }
      )
    }

    const statusCheck = await assertBusinessActive(business_id)
    if (!statusCheck.ok) {
      return NextResponse.json(
        { error: statusCheck.message },
        { status: statusCheck.status }
      )
    }

    // Update each setting
    const updates = Object.entries(settings).map(([key, value]) => {
      return supabaseAdmin
        .from('settings')
        .upsert({
          key,
          value: value as string,
          business_id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'business_id,key'
        })
    })

    await Promise.all(updates)

    // Fetch updated settings
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('*')
      .eq('business_id', business_id)

    if (error) throw error

    const result: Record<string, string> = {}
    data?.forEach(item => {
      result[item.key] = item.value
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
