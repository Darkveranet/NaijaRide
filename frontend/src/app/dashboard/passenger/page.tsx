'use client';
import { useMyBookings } from '@/lib/data';
import { SUPABASE_ENABLED, formatNaira } from '@/lib/supabase';
import { Skeleton, ConfigNotice } from '@/components/ui';
import { ContactDriver } from '@/components/ContactDriver';

export default function PassengerDashboard() {
  const { data, isLoading } = useMyBookings();
  const bookings = data ?? [];

  if (!SUPABASE_ENABLED) return <ConfigNotice />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">My bookings</h1>
      {isLoading && <Skeleton className="h-24" />}
      {!isLoading && bookings.length === 0 && <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">No bookings yet. Find a ride to get started.</div>}
      <div className="space-y-3">
        {bookings.map((b: any) => {
          const canContact = ['CONFIRMED', 'COMPLETED'].includes(b.status) && b.trip?.driver?.phone;
          return (
            <div key={b.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex justify-between">
                <div className="font-bold">{b.trip?.departureCity} → {b.trip?.destinationCity}</div>
                <StatusPill status={b.status} />
              </div>
              <div className="mt-1 text-sm text-gray-500">Ref {b.reference} · {b.seatCount} seat(s) · {formatNaira(b.amount)}</div>
              {canContact && (
                <div className="mt-3">
                  <ContactDriver compact phone={b.trip.driver.phone} driverName={b.trip.driver.firstName}
                    reference={b.reference} route={`${b.trip.departureCity} → ${b.trip.destinationCity}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const color: Record<string, string> = {
    CONFIRMED: 'bg-brand-50 text-brand-600', PENDING: 'bg-amber-50 text-amber-600',
    CANCELLED: 'bg-red-50 text-red-600', COMPLETED: 'bg-blue-50 text-blue-600', REFUNDED: 'bg-gray-100 text-gray-600',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color[status] ?? 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}
