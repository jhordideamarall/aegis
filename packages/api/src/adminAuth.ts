import { getAuthenticatedUserFromRequest } from './requestAuth'

export interface AdminUserContext {
  id: string
  email: string
}

function isAllowedAdminEmail(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase()
  const configuredAdmins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  if (configuredAdmins.length === 0) return false

  return configuredAdmins.includes(normalizedEmail)
}

export async function getAdminUserFromRequest(
  request: Request
): Promise<AdminUserContext | null> {
  const user = await getAuthenticatedUserFromRequest(request)

  if (!user?.email || !isAllowedAdminEmail(user.email)) return null

  return { id: user.id, email: user.email }
}
