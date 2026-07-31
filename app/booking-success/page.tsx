'use client';

// Paystack redirects here with ?reference=PAY-<bookingId>-<ts>. We actively
// VERIFY the reference through our Edge Function (source of truth) so the booking
// confirms even if the webhook never fired — then celebrate.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { verifyPayment } from '@/lib/payments';
import { formatNaira } from '@/lib/constants';
import { CheckCircle2, Loader2, XCircle, Receipt, LayoutDashboard } from 'lucide-react';

function bookingIdFromRef(ref: string | null): string | null {
  if (!ref) return null;
  const p = ref.split('-');
  if (p[0] !== 'PAY' || p.length < 3) return null;
  return p.slice(1, p.length - 1).join('-');
}

function Inner() {
  const params = useSearchParams();
  const router = useRouter();
  const reference = params.get('reference') || params.get('trxref');
  const bookingId = bookingIdFromRef(reference);

  const [state, setState] = useState<'checking' | 'paid' | 'error'>('checking');
  const [booking, setBooking] = useState<any>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!reference) { setState('error'); setMsg('Missing payment reference.'); return; }
    let stop = false;

    const run = async () => {
      // 1) Ask our function to verify with Paystack + confirm the booking.
      const v = await verifyPayment(reference);
      if (stop) return;

      if (v.ok) {
        // 2) Re-read the booking for display.
        if (bookingId) {
          const { data } = await supabase
            .from('bookings')
            .select('id, booking_reference, total_amount, status, payment_status')
            .eq('id', bookingId).maybeSingle();
          setBooking(data);
        }
        setState('paid');
        return;
      }
      // Not successful — surface a helpful reason.
      setMsg(
        v.status === 'rpc_error' ? `Payment ok but confirmation failed: ${v.error || ''}` :
        v.status === 'success' ? 'Verifying…' :
        `Payment status: ${v.status || 'unknown'}.`,
      );
      setState('error');
    };
    run();
    return () => { stop = true; };
  }, [reference, bookingId]);

  return (
    <div className="min-h-screen"><Navbar />
      <div className="container max-w-md py-16">
        <Card>
          <CardContent className="flex flex-col items-center py-10 text-center">
            {state === 'checking' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <h1 className="mt-4 font-display text-xl font-bold">Confirming your payment…</h1>
                <p className="mt-1 text-sm text-muted-foreground">Verifying with Paystack — one moment.</p>
              </>
            )}

            {state === 'paid' && (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10"><CheckCircle2 className="h-9 w-9 text-success" /></div>
                <h1 className="mt-4 font-display text-2xl font-bold">Booking confirmed! 🎉</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {booking?.booking_reference ? <>Reference <b>{booking.booking_reference}</b></> : 'Your seat is booked.'}
                  {booking?.total_amount ? <> · {formatNaira(booking.total_amount)} paid</> : null}
                </p>
                <div className="mt-6 flex w-full flex-col gap-2">
                  {booking?.id && <Button className="w-full gap-2" onClick={() => router.push(`/receipt?id=${booking.id}`)}><Receipt className="h-4 w-4" /> View receipt</Button>}
                  <Button variant="outline" className="w-full gap-2" onClick={() => router.push('/dashboard')}><LayoutDashboard className="h-4 w-4" /> Go to dashboard</Button>
                </div>
              </>
            )}

            {state === 'error' && (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10"><XCircle className="h-9 w-9 text-destructive" /></div>
                <h1 className="mt-4 font-display text-xl font-bold">Couldn&apos;t confirm payment</h1>
                <p className="mt-1 text-sm text-muted-foreground">{msg || 'If you were charged, your booking will confirm shortly. Check your dashboard.'}</p>
                <div className="mt-6 flex w-full flex-col gap-2">
                  <Button className="w-full" onClick={() => location.reload()}>Try again</Button>
                  <Button variant="outline" className="w-full" onClick={() => router.push('/dashboard')}>Go to dashboard</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}

export default function BookingSuccessPage() {
  return <Suspense fallback={<div className="min-h-screen"><Navbar /></div>}><Inner /></Suspense>;
}
