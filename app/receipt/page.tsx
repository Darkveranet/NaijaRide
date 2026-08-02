'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { formatNaira, formatDateTime } from '@/lib/constants';
import { Printer, XCircle, Loader2, ShieldCheck, MapPin, Share2 } from 'lucide-react';

function Inner() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const id = params.get('id') || '';
  const [b, setB] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    if (!id) { setLoadingData(false); return; }
    const { data } = await supabase
      .from('bookings')
      .select('*, trip:trips!bookings_trip_id_fkey(origin,destination,departure_time,pickup_point,dropoff_point, driver:profiles!trips_driver_id_fkey(full_name,phone))')
      .eq('id', id).maybeSingle();
    setB(data); setLoadingData(false);
  };
  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (user) load();
    // eslint-disable-next-line
  }, [user, loading]);

  const cancel = async () => {
    if (!confirm('Cancel this booking? Seats will be released.')) return;
    setCancelling(true);
    const { error } = await supabase.rpc('cancel_booking', { p_booking_id: id });
    setCancelling(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Booking cancelled'); load();
  };

  if (loading || loadingData) return <div className="min-h-screen"><Navbar /><div className="container max-w-lg py-8"><Skeleton className="h-96" /></div></div>;
  if (!b) return <div className="min-h-screen"><Navbar /><div className="container py-12 text-center text-muted-foreground">Booking not found.</div></div>;

  const departed = new Date(b.trip?.departure_time).getTime() < Date.now();
  const canCancel = ['pending', 'accepted', 'confirmed'].includes(b.status) && !departed;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(b.qr_token || b.booking_reference)}`;

  return (
    <div className="min-h-screen"><Navbar />
      <div className="container max-w-lg py-8">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h1 className="font-display text-xl font-bold">Booking receipt</h1>
          <div className="flex gap-2">
            {canCancel && (
              <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={cancel} disabled={cancelling}>
                {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} Cancel
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
              const url = `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH || ''}/trip-share/?token=${b.qr_token || b.booking_reference}`;
              const msg = `Track my NaijaRide trip live: ${url}`;
              if (navigator.share) navigator.share({ title: 'NaijaRide trip', text: msg, url }).catch(()=>{});
              else { navigator.clipboard.writeText(url).then(()=>toast.success('Share link copied')); window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank'); }
            }}><Share2 className="h-4 w-4" /> Share trip</Button>
            <Button size="sm" className="gap-1.5" onClick={() => window.print()}><Printer className="h-4 w-4" /> Save as PDF</Button>
          </div>
        </div>

        {/* Printable receipt */}
        <Card className="print:border-0 print:shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="font-display text-lg font-extrabold">Naija<span className="text-primary">Ride</span></p>
                <p className="text-xs text-muted-foreground">Intercity trip receipt</p>
              </div>
              <Badge className={b.payment_status === 'paid' ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'}>{b.status} · {b.payment_status}</Badge>
            </div>

            <div className="mt-4 flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2 text-sm">
                <Row label="Reference" value={b.booking_reference} strong />
                <Row label="Route" value={`${b.trip?.origin} → ${b.trip?.destination}`} />
                <Row label="Departure" value={formatDateTime(b.trip?.departure_time || '')} />
                <Row label="Pickup" value={b.trip?.pickup_point || b.trip?.origin} />
                <Row label="Drop-off" value={b.trip?.dropoff_point || b.trip?.destination} />
                <Row label="Seats" value={String(b.seats_booked)} />
                <Row label="Driver" value={`${b.trip?.driver?.full_name || '—'}${b.trip?.driver?.phone ? ' · ' + b.trip.driver.phone : ''}`} />
              </div>
              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="Booking QR" width={120} height={120} className="rounded-md border" />
                <p className="mt-1 text-[10px] text-muted-foreground">Show at boarding</p>
              </div>
            </div>

            <div className="mt-4 border-t pt-4">
              {b.discount > 0 && <Row label="Discount" value={`− ${formatNaira(b.discount)}`} />}
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total paid</span>
                <span className="font-display text-2xl font-bold text-primary">{formatNaira(b.total_amount)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1.5 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Verified driver · Secure payment via Paystack · Keep this receipt for boarding.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className={strong ? 'font-bold' : 'font-medium'}>{value}</span></div>;
}

export default function ReceiptPage() {
  return <Suspense fallback={<div className="min-h-screen"><Navbar /></div>}><Inner /></Suspense>;
}
