// Builds a WhatsApp "click to chat" deep link (works on mobile app + web).
// Nigerian numbers: 080... -> 23480... ; +234... -> 234... ; strips non-digits.
export function normalizeWaNumber(phone?: string | null): string | null {
  if (!phone) return null;
  let p = phone.replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '234' + p.slice(1);
  if (p.length === 10 && p.startsWith('8')) p = '234' + p;
  return p || null;
}

export function waLink(phone?: string | null, message = ''): string | null {
  const num = normalizeWaNumber(phone);
  if (!num) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${num}${text}`;
}
