/** Only same-app admin paths are allowed as a post-login destination (no open redirects). */
export function safeNextPath(value: string | null): string {
  if (!value?.startsWith('/admin') || value.startsWith('/admin/login')) return '/admin';
  return value;
}
