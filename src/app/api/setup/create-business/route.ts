import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createSetupToken } from '@/lib/setupToken'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { business_name, industry, email, phone, pic_name, address, city } = body

    if (!business_name || typeof business_name !== 'string' || !business_name.trim()) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      )
    }

    const normalizedBusinessName = business_name.trim()
    const subdomainBase = normalizedBusinessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const baseSubdomain = subdomainBase || 'business'
    
    // Retry mechanism to ensure unique subdomain
    let subdomain = baseSubdomain
    let attempts = 0
    const maxAttempts = 5
    
    while (attempts < maxAttempts) {
      // Check if subdomain already exists
      const { data: existing } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('subdomain', subdomain)
        .single()
      
      if (!existing) {
        // Subdomain is available
        break
      }
      
      // Subdomain taken, add random suffix and try again
      const randomSuffix = Math.random().toString(36).substring(2, 6)
      subdomain = `${baseSubdomain}-${randomSuffix}`
      attempts++
    }
    
    // Generate slug with random suffix
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const slug = `${subdomain}-${randomSuffix}`

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert([{
        business_name,
        subdomain,
        slug,
        industry,
        email,
        phone,
        pic_name: pic_name || null,
        address,
        city,
        settings: {
          receipt_header: normalizedBusinessName,
          receipt_footer: 'Terima Kasih!',
          paper_size: '58mm',
          currency: 'IDR',
          timezone: 'Asia/Jakarta'
        }
      }])
      .select()
      .single()

    if (businessError) {
      console.error('Business creation error:', businessError)
      throw new Error(businessError.message || 'Failed to create business')
    }

    return NextResponse.json({
      business_id: business.id,
      subdomain: business.subdomain,
      slug: business.slug,
      setup_token: createSetupToken(business.id)
    })
  } catch (error: any) {
    console.error('Error creating business:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create business' },
      { status: 500 }
    )
  }
}
