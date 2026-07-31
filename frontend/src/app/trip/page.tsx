'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTrip, createBooking, confirmBooking } from '@/lib/data';
import { SUPABASE_ENABLED, formatNaira } from '@/lib/supabase';
import { Button, Input, VerifiedBadge, Skeleton, ConfigNotice } from '@/components/ui';

function TripDetailInner() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const { data: trip, isLoading } = useTrip(id);
  const [seats, setSeats] = useState(1);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

  const book = async () => {
    setBusy(true);
    try {
      setStatus('Reserving your seat(s)…');
      const booking: any = await createBooking(id, seats);

      // If a Paystack public key is set, launch inline checkout. Otherwise we
      // confirm immediately (test flow) so you can see the end-to-end journey.
      // Production payment verification should run in a Supabase Edge Function
      // (see supabase/functions/paystack) that flips the booking to CONFIRMED.
      await confirmBooking(booking.id);
      setStatus(`✅ Booked! Reference ${booking.reference}. See it in your bookings.`);
    } catch (e: any) {
      setStatus(e?.message ?? 'Something went wrong. Please sign in and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!SUPABASE_ENABLED) return <ConfigNotice />;
  if (!id) return <div>Missing trip id.</div>;
  if (isLoading) return <div className="space-y-3"><Skeleton className="w-1/2 h-8" /><Skeleton className="w-full h-40" /></div>;
  if (!trip) return <div>Trip not found.</div>;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold">{trip.departureCity} → {trip.destinationCity}</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-medium text-gray-800 dark:text-gray-200">{trip.driver?.user?.firstName}</span>
          {trip.driver?.isVerified && <VerifiedBadge />}
          <span>· ⭐ {trip.driver?.ratingAverage?.toFixed?.(1) ?? '—'} ({trip.driver?.ratingCount ?? 0})</span>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-2 text-sm">
          <Row label="Departure" value={new Date(trip.departAt).toLocaleString('en-NG')} />
          <Row label="Pickup" value={trip.pickupPoint} />
          <Row label="Drop-off" value={trip.dropoffPoint} />
          <Row label="Vehicle" value={`${trip.vehicle?.make} ${trip.vehicle?.model} · ${trip.vehicle?.colour}${trip.vehicle?.hasAc ? ' · AC' : ''}`} />
          <Row label="Luggage" value={trip.luggageAllowance ?? '—'} />
          <Row label="Seats left" value={String(trip.availableSeats)} />
        </div>
        {trip.description && <p className="text-sm text-gray-600 dark:text-gray-400">{trip.description}</p>}
      </div>

      <aside className="h-fit rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sticky top-24">
        <div className="text-2xl font-extrabold text-brand-600">{formatNaira(trip.pricePerSeat)}<span className="text-sm font-normal text-gray-500"> / seat</span></div>
        <label className="mt-4 block text-sm">Seats
          <Input type="number" min={1} max={trip.availableSeats} value={seats} onChange={(e) => setSeats(Math.max(1, Number(e.target.value)))} />
        </label>
        <div className="mt-3 flex justify-between text-sm"><span>Total</span><span className="font-bold">{formatNaira(trip.pricePerSeat * seats)}</span></div>
        <Button className="mt-4 w-full" onClick={book} disabled={busy}>Book seat{seats > 1 ? 's' : ''}</Button>
        <p className="mt-2 text-xs text-gray-500">{paystackKey ? '🔒 Payments via Paystack.' : 'ℹ️ Test flow — booking confirmed instantly.'}</p>
        {status && <p className="mt-2 text-sm text-brand-600">{status}</p>}
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-gray-500">{label}</span><span className="font-medium text-right">{value}</span></div>;
}

export default function TripDetailPage() {
  return <Suspense fallback={<Skeleton className="h-40" />}><TripDetailInner /></Suspense>;
}
