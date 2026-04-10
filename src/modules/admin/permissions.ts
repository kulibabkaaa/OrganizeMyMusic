export function isAdminUser(email?: string | null) {
  return Boolean(email?.endsWith("@organizeyourmusic.app"));
}

