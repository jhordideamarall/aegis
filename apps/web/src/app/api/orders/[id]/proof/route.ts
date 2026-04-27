import { NextResponse } from 'next/server'
import { getOrderPaymentColumnSupport } from '@/lib/orderPaymentColumns'
import { supabaseAdmin } from '@/lib/supabase'
import { PAYMENT_PROOF_BUCKET } from '@/lib/payments'
import {
  forbiddenResponse,
  getBusinessContextFromRequest,
  unauthorizedResponse
} from '@/lib/requestAuth'

const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024

function getFileExtension(fileName: string, mimeType: string): string {
  const fromName = fileName.split('.').pop()?.toLowerCase()
  if (fromName) return fromName

  switch (mimeType) {
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/heic':
      return 'heic'
    default:
      return 'jpg'
  }
}

async function ensurePaymentProofBucket() {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()

  if (listError) {
    throw listError
  }

  const exists = buckets.some((bucket) => bucket.id === PAYMENT_PROOF_BUCKET || bucket.name === PAYMENT_PROOF_BUCKET)

  if (exists) {
    return
  }

  const { error: createError } = await supabaseAdmin.storage.createBucket(PAYMENT_PROOF_BUCKET, {
    public: true,
    fileSizeLimit: MAX_PROOF_SIZE_BYTES
  })

  if (createError && !createError.message.toLowerCase().includes('already exists')) {
    throw createError
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const businessContext = await getBusinessContextFromRequest(request)

    if (!businessContext) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const formData = await request.formData()
    const businessId = formData.get('business_id')
    const file = formData.get('file')

    if (businessId && typeof businessId === 'string' && businessId !== businessContext.businessId) {
      return forbiddenResponse('Cannot upload proof for another business')
    }

    const resolvedBusinessId = businessContext.businessId

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      )
    }

    const paymentColumnSupport = await getOrderPaymentColumnSupport()

    if (!paymentColumnSupport.proof) {
      return NextResponse.json(
        { error: 'Payment proof columns are not available yet. Run supabase-payment-schema.sql first.' },
        { status: 409 }
      )
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image uploads are supported' },
        { status: 400 }
      )
    }

    if (file.size > MAX_PROOF_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Image must be 5 MB or smaller' },
        { status: 400 }
      )
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('id', id)
      .eq('business_id', resolvedBusinessId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    await ensurePaymentProofBucket()

    const extension = getFileExtension(file.name, file.type)
    const filePath = `${resolvedBusinessId}/${id}/${Date.now()}-${crypto.randomUUID()}.${extension}`
    const arrayBuffer = await file.arrayBuffer()
    const uploadBuffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabaseAdmin
      .storage
      .from(PAYMENT_PROOF_BUCKET)
      .upload(filePath, uploadBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      throw uploadError
    }

    const {
      data: { publicUrl }
    } = supabaseAdmin.storage.from(PAYMENT_PROOF_BUCKET).getPublicUrl(filePath)

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        payment_proof_url: publicUrl,
        payment_proof_path: filePath,
        payment_proof_uploaded_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('business_id', resolvedBusinessId)
      .select('payment_proof_url, payment_proof_path, payment_proof_uploaded_at')
      .single()

    if (updateError) {
      // File was uploaded but DB update failed — remove the orphaned file from Storage
      await supabaseAdmin.storage.from(PAYMENT_PROOF_BUCKET).remove([filePath])
      throw updateError
    }

    return NextResponse.json(updatedOrder)
  } catch (error) {
    // Log internally for debugging (use structured logging service in production)
    // Don't expose internal error details to client
    return NextResponse.json(
      { error: 'Failed to upload payment proof' },
      { status: 500 }
    )
  }
}
