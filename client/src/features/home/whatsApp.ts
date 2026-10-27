/** A WhatsApp chat link, only for a number written in international form (+977 …). */
export function whatsAppUrl(phone: string | undefined): string | undefined {
  if (!phone?.trim().startsWith('+')) return undefined;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 ? `https://wa.me/${digits}` : undefined;
}
