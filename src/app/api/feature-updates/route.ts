import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isFeatureUpdatesTableMissing, normalizeFeatureUpdate } from '@/lib/featureUpdates'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('feature_updates')
      .select('*')
      .eq('status', 'published')
      .order('featured', { ascending: false })
      .order('published_at', { ascending: false })

    if (error) {
      if (isFeatureUpdatesTableMissing(error)) {
        return NextResponse.json([])
      }
      throw error
    }

    return NextResponse.json((data || []).map(normalizeFeatureUpdate))
  } catch (error: any) {
    console.error('Error fetching feature updates:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch feature updates' },
      { status: 500 }
    )
  }
}
