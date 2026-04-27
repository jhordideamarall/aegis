import { NextResponse } from 'next/server'

export {
  getBearerToken,
  getAuthenticatedUserFromRequest,
  getBusinessContextFromRequest,
  type AuthenticatedUser,
  type BusinessContext,
} from '@aegis/api'

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 })
}
