'use client';

// Static-export-safe replacement for app/trips/[id]/page.tsx.
// The trip id comes from ?id=... (GitHub Pages can't serve DB-driven [id] paths).
// The DESIGN is a faithful copy of the shared repo's trip detail, plus a green
// WhatsApp "Contact driver" button.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { payWithPaystack, PAYSTACK_ENABLED } from '@/lib/payments';
import { useAuth } from '@/components/providers/auth-provider';
import { formatNaira, formatDateTime, timeUntil, TRIP_STATUS_LABELS } from '@/lib/constants';
import { TripWithDriver, Review } from '@/lib/types';
import {
  Users, Star, Snowflake, Car, ShieldCheck, Luggage, CheckCircle2, Loader2, MessageCircle,
} from 'lucide-react';

function waLink(phone?: string | null, message = ''): string | null {
  if (!phone) return null;
  let p = phone.replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '234' + p.slice(1);
  if (!p) return null;
  return `https://wa.me/${p}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

function TripDetail() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const router = useRouter();
  const { user, profile } = useAuth();
  const [trip, setTrip] = useState<TripWithDriver | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState(1);
  const [promo, setPromo] = useState('');
  const [discount, setDiscount] = useState(0);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    const load = async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(`*, driver:profiles!trips_driver_id_fkey(*), vehicle:vehicles!trips_vehicle_id_fkey(*)`)
        .eq('id', id)
        .maybeSingle();
      if (error || !data) { toast.error('Trip not found'); router.push('/search'); return; }
      setTrip(data as TripWithDriver);
      const { data: revs } = await supabase
        .from('reviews')
        .select(`*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)`)
        .eq('reviewee_id', data.driver_id)
        .order('created_at', { ascending: false })
        .limit(5);
      setReviews((revs || []) as Review[]);
      setLoading(false);
    };
    load();
  }, [id, router]);

  const handleBook = async () => {
    if (!user) { toast.error('Please sign in to book a trip'); router.push('/login'); return; }
    if (!trip) return;
    setBooking(true);
    // Create the booking (applies promo code + returns discount) via Phase 1 RPC.
    const { data, error } = await supabase.rpc('request_booking', {
      p_trip_id: trip.id, p_seats: seats, p_promo: promo.trim() || null,
    });
    if (error) { setBooking(false); toast.error(error.message); return; }
    const result = data as { error?: string; id?: string; booking_reference?: string; discount?: number };
    if (result?.error) { setBooking(false); toast.error(result.error); return; }
    if (result?.discount) setDiscount(result.discount);

    if (PAYSTACK_ENABLED) {
      // Real payment: redirect to Paystack. The webhook confirms + credits the driver.
      try {
        await payWithPaystack({ id: result.id!, total_amount: (trip.price_per_seat * seats) - (result.discount || 0) });
        return; // browser navigates away to Paystack
      } catch (e: any) {
        setBooking(false); toast.error(e?.message || 'Could not start payment'); return;
      }
    }

    // Test flow (no Paystack key set): confirm immediately.
    const { error: payErr } = await supabase.rpc('mark_payment_success', {
      p_booking_id: result.id, p_ref: 'TEST-' + Date.now(), p_channel: 'test',
    });
    setBooking(false);
    if (payErr) { toast.error(payErr.message); return; }
    toast.success(`Booking confirmed! Reference: ${result?.booking_reference}`);
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen"><Navbar />
        <div className="container py-12">
          <Skeleton className="h-8 w-48" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_400px]">
            <Skeleton className="h-96 w-full" /><Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }
  if (!trip) return <div className="min-h-screen"><Navbar /><div className="container py-12">Trip not found.</div></div>;

  const isPast = new Date(trip.departure_time).getTime() < Date.now();
  const isFull = trip.available_seats === 0;
  const contactHref = waLink(
    trip.driver?.phone,
    `Hello ${trip.driver?.full_name ?? ''}, I'm reaching out via NaijaRide about your ${trip.origin} → ${trip.destination} trip.`,
  );

  return (
    <div className="min-h-screen"><Navbar />
      <div className="container py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Card><CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{TRIP_STATUS_LABELS[trip.status]}</Badge>
                {trip.driver?.is_verified_driver && (
                  <Badge className="gap-1 bg-success/10 text-success"><ShieldCheck className="h-3 w-3" /> Verified Driver</Badge>
                )}
                <span className="text-xs text-muted-foreground">{timeUntil(trip.departure_time)}</span>
              </div>
              <div className="mt-5 flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <span className="flex h-3 w-3 items-center justify-center rounded-full bg-primary ring-4 ring-primary/20" />
                  <span className="my-1 h-12 w-px bg-border" />
                  <span className="flex h-3 w-3 items-center justify-center rounded-full bg-accent ring-4 ring-accent/20" />
                </div>
                <div className="flex-1 space-y-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Pickup</p>
                    <p className="font-display text-lg font-semibold">{trip.origin}</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(trip.departure_time)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Drop-off</p>
                    <p className="font-display text-lg font-semibold">{trip.destination}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl font-bold text-primary">{formatNaira(trip.price_per_seat)}</p>
                  <p className="text-xs text-muted-foreground">per seat</p>
                </div>
              </div>
              {trip.description && <div className="mt-6 rounded-lg bg-secondary/50 p-4"><p className="text-sm">{trip.description}</p></div>}
            </CardContent></Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Car className="h-5 w-5" /> Vehicle</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex h-24 w-32 items-center justify-center rounded-lg bg-secondary"><Car className="h-10 w-10 text-muted-foreground" /></div>
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold">{trip.vehicle?.make} {trip.vehicle?.model} ({trip.vehicle?.year})</p>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{trip.vehicle?.color}</span>
                      <span className="font-medium text-foreground">{trip.vehicle?.plate_number}</span>
                      {trip.vehicle?.has_ac && <Badge variant="secondary" className="gap-1"><Snowflake className="h-3 w-3" /> Air Conditioned</Badge>}
                    </div>
                    <div className="flex items-center gap-1 text-sm"><Users className="h-4 w-4 text-muted-foreground" /><span>{trip.total_seats} seats total · {trip.available_seats} available</span></div>
                    <div className="flex items-center gap-1 text-sm"><Luggage className="h-4 w-4 text-muted-foreground" /><span>{trip.luggage_allowance}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5" /> Your Driver</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={trip.driver?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">{trip.driver?.full_name?.[0] ?? 'D'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-lg font-semibold">{trip.driver?.full_name}</p>
                      {trip.driver?.is_verified_driver && <Badge className="gap-1 bg-success/10 text-success"><ShieldCheck className="h-3 w-3" /> Verified</Badge>}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-warning text-warning" />{trip.driver?.rating?.toFixed(1) ?? 'New'} ({trip.driver?.rating_count} reviews)</span>
                    </div>
                    {contactHref && user && (
                      <div className="mt-3">
                        <a href={contactHref} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="gap-1.5 bg-[#25D366] text-white hover:brightness-95">
                            <MessageCircle className="h-3.5 w-3.5" /> Contact driver on WhatsApp
                          </Button>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {reviews.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Recent Reviews</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="border-b border-border/60 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <div className="flex">{[...Array(5)].map((_, i) => (<Star key={i} className={`h-4 w-4 ${i < rev.rating ? 'fill-warning text-warning' : 'text-muted'}`} />))}</div>
                        <span className="text-xs text-muted-foreground">{new Date(rev.created_at).toLocaleDateString()}</span>
                      </div>
                      {rev.comment && <p className="mt-2 text-sm">{rev.comment}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:sticky lg:top-20 lg:self-start">
            <Card className="border-border/60 shadow-lg">
              <CardHeader><CardTitle className="text-lg">Book this trip</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Price per seat</span><span className="font-semibold">{formatNaira(trip.price_per_seat)}</span></div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Seats</label>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => setSeats((s) => Math.max(1, s - 1))} disabled={seats <= 1}>−</Button>
                    <span className="w-12 text-center font-display text-lg font-bold">{seats}</span>
                    <Button variant="outline" size="icon" onClick={() => setSeats((s) => Math.min(trip.available_seats, s + 1))} disabled={seats >= trip.available_seats}>+</Button>
                    <span className="ml-2 text-xs text-muted-foreground">{trip.available_seats} available</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Promo code</label>
                  <Input value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} placeholder="Have a code?" />
                </div>
                <Separator />
                <div className="flex items-center justify-between"><span className="font-medium">Total{discount > 0 ? ` (−${formatNaira(discount)})` : ''}</span><span className="font-display text-2xl font-bold text-primary">{formatNaira(Math.max(0, trip.price_per_seat * seats - discount))}</span></div>
                {isPast ? (
                  <Badge variant="secondary" className="w-full justify-center py-2">This trip has departed</Badge>
                ) : isFull ? (
                  <Badge variant="secondary" className="w-full justify-center py-2">This trip is fully booked</Badge>
                ) : !user ? (
                  <Button className="w-full" onClick={() => router.push('/login')}>Sign in to book</Button>
                ) : trip.driver_id === user.id ? (
                  <Badge variant="secondary" className="w-full justify-center py-2">This is your trip</Badge>
                ) : (
                  <Button className="w-full gap-2" onClick={handleBook} disabled={booking}>
                    {booking ? (<><Loader2 className="h-4 w-4 animate-spin" /> {PAYSTACK_ENABLED ? 'Redirecting…' : 'Confirming...'}</>) : (<><CheckCircle2 className="h-4 w-4" /> {PAYSTACK_ENABLED ? `Pay ${formatNaira(Math.max(0, trip.price_per_seat * seats - discount))}` : 'Confirm booking'}</>)}
                  </Button>
                )}
                <p className="text-center text-xs text-muted-foreground">Secure booking · Free cancellation up to 24h before departure</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function TripPage() {
  return (
    <Suspense fallback={<div className="min-h-screen"><Navbar /></div>}>
      <TripDetail />
    </Suspense>
  );
}
