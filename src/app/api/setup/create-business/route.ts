import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { business_name, industry, email, phone, address, city } = body

    const subdomain = business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
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
        address,
        city,
        settings: {
          receipt_header: business_name,
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
      slug: business.slug
    })
  } catch (error: any) {
    console.error('Error creating business:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create business' },
      { status: 500 }
    )
  }
}
