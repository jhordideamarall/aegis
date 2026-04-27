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
  } catch (error) {
    // Log internally for debugging (use structured logging service in production)
    // Don't expose internal error details to client
    return NextResponse.json(
      { error: 'Failed to fetch feature updates' },
      { status: 500 }
    )
  }
}
