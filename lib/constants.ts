export const NIGERIAN_CITIES = [
  'Lagos',
  'Abuja',
  'Port Harcourt',
  'Kano',
  'Ibadan',
  'Benin City',
  'Kaduna',
  'Enugu',
  'Onitsha',
  'Aba',
  'Jos',
  'Warri',
  'Owerri',
  'Calabar',
  'Uyo',
  'Sokoto',
  'Maiduguri',
  'Akure',
  'Ilorin',
  'Lokoja',
] as const;

export type NigerianCity = (typeof NIGERIAN_CITIES)[number];

export const TRIP_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export const KYC_STATUS_LABELS: Record<string, string> = {
  unverified: 'Unverified',
  pending: 'Under Review',
  verified: 'Verified',
  rejected: 'Rejected',
};

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const hours = Math.round(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Less than an hour';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} away`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} away`;
}
