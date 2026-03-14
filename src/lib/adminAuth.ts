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

  if (configuredAdmins.length > 0) {
    return configuredAdmins.includes(normalizedEmail)
  }

  const [localPart] = normalizedEmail.split('@')
  return localPart === 'admin' || localPart.startsWith('admin+')
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
