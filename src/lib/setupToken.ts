import crypto from 'node:crypto'

interface SetupTokenPayload {
  businessId: string
  iat: number
  exp: number
  nonce: string
}

function getSetupTokenSecret() {
  const secret = process.env.SETUP_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!secret) {
    throw new Error('Server misconfigured')
  }

  return secret
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signPayload(encodedPayload: string) {
  return crypto
    .createHmac('sha256', getSetupTokenSecret())
    .update(encodedPayload)
    .digest('base64url')
}

export function createSetupToken(businessId: string, ttlSeconds = 15 * 60) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload: SetupTokenPayload = {
    businessId,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
    nonce: crypto.randomBytes(8).toString('hex')
  }

  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signature = signPayload(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function verifySetupToken(token: string, businessId: string) {
  if (!token || !businessId) {
    return { ok: false, error: 'Missing setup token' as const }
  }

  const [encodedPayload, signature] = token.split('.')

  if (!encodedPayload || !signature) {
    return { ok: false, error: 'Invalid setup token' as const }
  }

  const expectedSignature = signPayload(encodedPayload)

  const providedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return { ok: false, error: 'Invalid setup token' as const }
  }

  let payload: SetupTokenPayload

  try {
    payload = JSON.parse(decodeBase64Url(encodedPayload)) as SetupTokenPayload
  } catch {
    return { ok: false, error: 'Invalid setup token' as const }
  }

  if (payload.businessId !== businessId) {
    return { ok: false, error: 'Setup token does not match this business' as const }
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: 'Setup token has expired' as const }
  }

  return { ok: true, payload }
}
