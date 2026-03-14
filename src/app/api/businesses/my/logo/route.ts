import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase'

const LOGO_BUCKET = 'business-logos'
const MAX_LOGO_SIZE_BYTES = 3 * 1024 * 1024

function getFileExtension(fileName: string, mimeType: string): string {
  const fromName = fileName.split('.').pop()?.toLowerCase()
  if (fromName) return fromName

  switch (mimeType) {
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/svg+xml':
      return 'svg'
    default:
      return 'jpg'
  }
}

async function getAuthenticatedBusiness(request: Request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!token) {
    return { error: NextResponse.json({ error: 'Missing access token' }, { status: 401 }) }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return { error: NextResponse.json({ error: 'Server misconfigured' }, { status: 500 }) }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data: { user }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) }
  }

  const { data: businessUser, error: businessError } = await supabaseAdmin
    .from('business_users')
    .select('business_id')
    .eq('user_id', user.id)
    .single()

  if (businessError || !businessUser) {
    return { error: NextResponse.json({ error: 'Business not found' }, { status: 404 }) }
  }

  return { userId: user.id, businessId: businessUser.business_id }
}

async function ensureLogoBucket() {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()
  if (listError) throw listError

  const exists = buckets.some((bucket) => bucket.id === LOGO_BUCKET || bucket.name === LOGO_BUCKET)
  if (exists) return

  const { error: createError } = await supabaseAdmin.storage.createBucket(LOGO_BUCKET, {
    public: true,
    fileSizeLimit: MAX_LOGO_SIZE_BYTES
  })

  if (createError && !createError.message.toLowerCase().includes('already exists')) {
    throw createError
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedBusiness(request)
    if ('error' in auth) return auth.error

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are supported' }, { status: 400 })
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      return NextResponse.json({ error: 'Logo must be 3 MB or smaller' }, { status: 400 })
    }

    await ensureLogoBucket()

    const { data: currentBusiness, error: currentBusinessError } = await supabaseAdmin
      .from('businesses')
      .select('logo_url')
      .eq('id', auth.businessId)
      .single()

    if (currentBusinessError) throw currentBusinessError

    const extension = getFileExtension(file.name, file.type)
    const filePath = `${auth.businessId}/logo-${Date.now()}-${crypto.randomUUID()}.${extension}`
    const arrayBuffer = await file.arrayBuffer()
    const uploadBuffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabaseAdmin
      .storage
      .from(LOGO_BUCKET)
      .upload(filePath, uploadBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) throw uploadError

    if (currentBusiness?.logo_url) {
      const marker = `/${LOGO_BUCKET}/`
      const markerIndex = currentBusiness.logo_url.indexOf(marker)
      if (markerIndex >= 0) {
        const oldPath = currentBusiness.logo_url.slice(markerIndex + marker.length)
        if (oldPath) {
          await supabaseAdmin.storage.from(LOGO_BUCKET).remove([oldPath])
        }
      }
    }

    const {
      data: { publicUrl }
    } = supabaseAdmin.storage.from(LOGO_BUCKET).getPublicUrl(filePath)

    const { data: business, error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        logo_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', auth.businessId)
      .select('id, business_name, logo_url')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ business })
  } catch (error) {
    console.error('Error uploading business logo:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to upload logo', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getAuthenticatedBusiness(request)
    if ('error' in auth) return auth.error

    const { data: currentBusiness, error: currentBusinessError } = await supabaseAdmin
      .from('businesses')
      .select('logo_url')
      .eq('id', auth.businessId)
      .single()

    if (currentBusinessError) throw currentBusinessError

    if (currentBusiness?.logo_url) {
      const marker = `/${LOGO_BUCKET}/`
      const markerIndex = currentBusiness.logo_url.indexOf(marker)
      if (markerIndex >= 0) {
        const oldPath = currentBusiness.logo_url.slice(markerIndex + marker.length)
        if (oldPath) {
          await supabaseAdmin.storage.from(LOGO_BUCKET).remove([oldPath])
        }
      }
    }

    const { data: business, error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        logo_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', auth.businessId)
      .select('id, business_name, logo_url')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ business })
  } catch (error) {
    console.error('Error deleting business logo:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to remove logo', details: errorMessage },
      { status: 500 }
    )
  }
}
