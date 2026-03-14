import { NextResponse } from 'next/server'
import { getAdminUserFromRequest } from '@/lib/adminAuth'
import {
  isFeatureUpdatesTableMissing,
  normalizeFeatureUpdate,
  parseHighlights,
  slugifyFeatureUpdate
} from '@/lib/featureUpdates'
import { supabaseAdmin } from '@/lib/supabase'

async function createUniqueSlug(base: string) {
  let slug = base
  let counter = 1

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('feature_updates')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (error) throw error
    if (!data) return slug

    counter += 1
    slug = `${base}-${counter}`
  }
}

export async function GET(request: Request) {
  try {
    const adminUser = await getAdminUserFromRequest(request)

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('feature_updates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      if (isFeatureUpdatesTableMissing(error)) {
        return NextResponse.json({
          updates: []
        })
      }
      throw error
    }

    return NextResponse.json({
      updates: (data || []).map(normalizeFeatureUpdate)
    })
  } catch (error: any) {
    console.error('Error fetching admin feature updates:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch feature updates' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await getAdminUserFromRequest(request)

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const title = String(body.title || '').trim()
    const version = String(body.version || '').trim()
    const summary = String(body.summary || '').trim()
    const content = String(body.content || '').trim()
    const featured = Boolean(body.featured)
    const publishNow = Boolean(body.publishNow)
    const highlights = parseHighlights(body.highlights)

    if (!title || !summary || !content) {
      return NextResponse.json(
        { error: 'Title, summary, and content are required' },
        { status: 400 }
      )
    }

    const slug = await createUniqueSlug(slugifyFeatureUpdate(version ? `${version}-${title}` : title))
    const timestamp = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('feature_updates')
      .insert({
        slug,
        title,
        version: version || null,
        summary,
        content,
        highlights,
        featured,
        status: publishNow ? 'published' : 'draft',
        published_at: publishNow ? timestamp : null,
        created_by_email: adminUser.email,
        updated_at: timestamp
      })
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json(normalizeFeatureUpdate(data))
  } catch (error: any) {
    console.error('Error creating feature update:', error)
    if (isFeatureUpdatesTableMissing(error)) {
      return NextResponse.json(
        { error: 'Schema feature updates belum dijalankan. Jalankan supabase-feature-updates-schema.sql terlebih dahulu.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create feature update' },
      { status: 500 }
    )
  }
}
