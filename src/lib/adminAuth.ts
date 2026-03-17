import { getAuthenticatedUserFromRequest } from '@/lib/requestAuth'

export interface AdminUserContext {
  id: string
  email: string
}

function isAllowedAdminEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const configuredAdmins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  // Deny all if ADMIN_EMAILS is not configured — never use a pattern-based fallback
  // as it would allow anyone with admin@* email to gain admin access.
  if (configuredAdmins.length === 0) {
    return false
  }

  return configuredAdmins.includes(normalizedEmail)
}

export async function getAdminUserFromRequest(request: Request): Promise<AdminUserContext | null> {
  const user = await getAuthenticatedUserFromRequest(request)

  if (!user?.email || !isAllowedAdminEmail(user.email)) {
    return null
  }

  return {
    id: user.id,
    email: user.email
  }
}
