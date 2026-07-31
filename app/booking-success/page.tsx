'use client';

// Where Paystack sends the browser after checkout. Paystack appends
// ?reference=PAY-<bookingId>-<ts> (and ?trxref=...). The webhook confirms the
// booking server-side; here we poll the booking until it's paid, then celebrate.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { formatNaira } from '@/lib/constants';
import { CheckCircle2, Loader2, XCircle, Receipt, LayoutDashboard } from 'lucide-react';

function bookingIdFromRef(ref: string | null): string | null {
  if (!ref) return null;
  // reference format: PAY-<uuid>-<timestamp>  (uuid has dashes → rejoin middle parts)
  const parts = ref.split('-');
  if (parts[0] !== 'PAY' || parts.length < 3) return null;
  return parts.slice(1, parts.length - 1).join('-');
}

function Inner() {
  const params = useSearchParams();
  const router = useRouter();
  const reference = params.get('reference') || params.get('trxref');
  const bookingId = bookingIdFromRef(reference);

  const [state, setState] = useState<'checking' | 'paid' | 'pending' | 'error'>('checking');
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (!bookingId) { setState('error'); return; }
    let tries = 0;
    let stop = false;

    const poll = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, booking_reference, total_amount, status, payment_status')
        .eq('id', bookingId)
        .maybeSingle();
      if (stop) return;
      if (data) {
        setBooking(data);
        if (data.payment_status === 'paid' || data.status === 'confirmed') { setState('paid'); return; }
      }
      tries += 1;
      if (tries >= 8) { setState('pending'); return; } // ~16s; webhook usually faster
      setTimeout(poll, 2000);
    };
    poll();
    return () => { stop = true; };
  }, [bookingId]);

  return (
    <div className="min-h-screen"><Navbar />
      <div className="container max-w-md py-16">
        <Card>
          <CardContent className="flex flex-col items-center py-10 text-center">
            {state === 'checking' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <h1 className="mt-4 font-display text-xl font-bold">Confirming your payment…</h1>
                <p className="mt-1 text-sm text-muted-foreground">Hang on a moment while we verify with Paystack.</p>
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
                  <Button className="w-full gap-2" onClick={() => router.push(`/receipt?id=${booking?.id}`)}><Receipt className="h-4 w-4" /> View receipt</Button>
                  <Button variant="outline" className="w-full gap-2" onClick={() => router.push('/dashboard')}><LayoutDashboard className="h-4 w-4" /> Go to dashboard</Button>
                </div>
              </>
            )}

            {state === 'pending' && (
              <>
                <Loader2 className="h-12 w-12 text-accent" />
                <h1 className="mt-4 font-display text-xl font-bold">Payment received</h1>
                <p className="mt-1 text-sm text-muted-foreground">We&apos;re finalising your booking. It will show as confirmed in your dashboard shortly.</p>
                <div className="mt-6 flex w-full flex-col gap-2">
                  <Button className="w-full gap-2" onClick={() => router.push('/dashboard')}><LayoutDashboard className="h-4 w-4" /> Go to dashboard</Button>
                  {booking?.id && <Button variant="outline" className="w-full gap-2" onClick={() => router.push(`/receipt?id=${booking.id}`)}><Receipt className="h-4 w-4" /> View receipt</Button>}
                </div>
              </>
            )}

            {state === 'error' && (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10"><XCircle className="h-9 w-9 text-destructive" /></div>
                <h1 className="mt-4 font-display text-xl font-bold">Couldn&apos;t verify payment</h1>
                <p className="mt-1 text-sm text-muted-foreground">If you were charged, your booking will still confirm automatically. Check your dashboard.</p>
                <Button className="mt-6 w-full" onClick={() => router.push('/dashboard')}>Go to dashboard</Button>
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
