'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { formatDateTime, formatNaira } from '@/lib/constants';
import { QrCode, CheckCircle2, XCircle, Loader2, ScanLine } from 'lucide-react';

function Inner() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [token, setToken] = useState(params.get('token') || '');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!loading && profile && profile.role !== 'driver' && profile.role !== 'admin') { router.push('/dashboard'); return; }
    if (token && !result) verify();
    // eslint-disable-next-line
  }, [loading, user, profile]);

  const verify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = token.trim();
    if (!t) return;
    setChecking(true); setResult(null);
    // match by qr_token OR booking_reference; RLS lets the trip's driver read it
    const { data } = await supabase
      .from('bookings')
      .select('id, booking_reference, seats_booked, status, payment_status, qr_token, trip:trips!bookings_trip_id_fkey(origin,destination,departure_time,driver_id), passenger:profiles!bookings_passenger_id_fkey(full_name)')
      .or(`qr_token.eq.${t},booking_reference.eq.${t.toUpperCase()}`)
      .maybeSingle();
    setChecking(false);
    if (!data) { setResult({ ok: false, reason: 'No matching booking found.' }); return; }
    const valid = data.payment_status === 'paid' && ['confirmed', 'completed'].includes(data.status);
    setResult({ ok: valid, booking: data, reason: valid ? null : `Booking is ${data.status}/${data.payment_status} — not a valid paid ticket.` });
  };

  if (loading) return <div className="min-h-screen"><Navbar /></div>;

  return (
    <div className="min-h-screen"><Navbar />
      <div className="container max-w-md py-10">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><QrCode className="h-6 w-6 text-primary" /></div>
          <h1 className="mt-3 font-display text-2xl font-bold">Verify booking</h1>
          <p className="text-sm text-muted-foreground">Scan the passenger&apos;s QR or enter their booking reference / token.</p>
        </div>

        <Card className="mb-4">
          <CardContent className="p-5">
            <form onSubmit={verify} className="space-y-3">
              <Label>Booking reference or QR token</Label>
              <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="NR-XXXXXXXX or scanned token" autoFocus />
              <Button type="submit" className="w-full gap-2" disabled={checking}>
                {checking ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</> : <><ScanLine className="h-4 w-4" /> Verify</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <Card className={result.ok ? 'border-success/40' : 'border-destructive/40'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {result.ok ? <><CheckCircle2 className="h-5 w-5 text-success" /> Valid ticket</> : <><XCircle className="h-5 w-5 text-destructive" /> Not valid</>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {result.booking ? (
                <>
                  <Row label="Passenger" value={result.booking.passenger?.full_name || '—'} />
                  <Row label="Route" value={`${result.booking.trip?.origin} → ${result.booking.trip?.destination}`} />
                  <Row label="Departs" value={formatDateTime(result.booking.trip?.departure_time || '')} />
                  <Row label="Seats" value={String(result.booking.seats_booked)} />
                  <Row label="Reference" value={result.booking.booking_reference} />
                  <div className="pt-2"><Badge className={result.ok ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>{result.booking.status} · {result.booking.payment_status}</Badge></div>
                </>
              ) : <p className="text-muted-foreground">{result.reason}</p>}
              {!result.ok && result.booking && <p className="pt-1 text-xs text-destructive">{result.reason}</p>}
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}

export default function VerifyBookingPage() {
  return <Suspense fallback={<div className="min-h-screen"><Navbar /></div>}><Inner /></Suspense>;
}
