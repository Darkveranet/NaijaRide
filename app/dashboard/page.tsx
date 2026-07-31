'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { formatNaira, formatDateTime, BOOKING_STATUS_LABELS } from '@/lib/constants';
import { BookingWithTrip } from '@/lib/types';
import {
  Calendar, MapPin, ArrowRight, Search, Ticket, Clock, Wallet, CheckCircle2,
  TrendingUp, Star, MessageCircle, Repeat,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';

function Meter({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

const GREEN = 'hsl(152 76% 36%)';

function waLink(phone?: string | null, msg = '') {
  if (!phone) return null;
  let p = phone.replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '234' + p.slice(1);
  return `https://wa.me/${p}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`;
}

function Stat({ icon: Icon, label, value, tint }: { icon: any; label: string; value: string; tint: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold leading-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [bookings, setBookings] = useState<BookingWithTrip[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<{ id: string; origin: string; destination: string }[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!loading && profile?.role === 'driver') { router.push('/driver'); return; }
    if (!loading && profile?.role === 'admin') { router.push('/admin'); return; }
    if (!user) return;
    const load = async () => {
      const [{ data: b }, { data: sr }] = await Promise.all([
        supabase
          .from('bookings')
          .select(`*, trip:trips(*, driver:profiles!trips_driver_id_fkey(*), vehicle:vehicles!trips_vehicle_id_fkey(*))`)
          .eq('passenger_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('saved_routes').select('id, origin, destination').eq('passenger_id', user.id).limit(6),
      ]);
      setBookings((b || []) as BookingWithTrip[]);
      setSavedRoutes((sr || []) as any);
      setLoadingData(false);
    };
    load();
  }, [user, profile, loading, router]);

  const now = Date.now();
  const upcoming = useMemo(
    () => bookings.filter((b) => b.status === 'confirmed' && b.trip && new Date(b.trip.departure_time).getTime() > now),
    [bookings],
  );
  const past = useMemo(
    () => bookings.filter((b) => !(b.status === 'confirmed' && b.trip && new Date(b.trip.departure_time).getTime() > now)),
    [bookings],
  );
  const totalSpent = useMemo(
    () => bookings.filter((b) => b.status !== 'cancelled').reduce((s, b) => s + (b.total_amount || 0), 0),
    [bookings],
  );

  // Spending over the last 6 months.
  const spendData = useMemo(() => {
    const buckets: { key: string; label: string; total: number }[] = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
      buckets.push({ key: `${dt.getFullYear()}-${dt.getMonth()}`, label: dt.toLocaleString('en-NG', { month: 'short' }), total: 0 });
    }
    for (const b of bookings) {
      if (b.status === 'cancelled') continue;
      const dt = new Date(b.created_at);
      const k = `${dt.getFullYear()}-${dt.getMonth()}`;
      const bucket = buckets.find((x) => x.key === k);
      if (bucket) bucket.total += (b.total_amount || 0);
    }
    return buckets;
  }, [bookings]);

  const nextTrip = upcoming[0];

  if (loading || loadingData) {
    return (
      <div className="min-h-screen"><Navbar />
        <div className="container py-8 space-y-6">
          <Skeleton className="h-9 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen"><Navbar />
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Hello, {profile?.full_name?.split(' ')[0] || 'there'} 👋</h1>
            <p className="text-sm text-muted-foreground">Here's what's happening with your trips.</p>
          </div>
          <Button onClick={() => router.push('/search')} className="gap-2"><Search className="h-4 w-4" /> Find a trip</Button>
        </div>

        {/* Next trip highlight */}
        {nextTrip?.trip && (
          <Card className="mb-6 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><Clock className="h-6 w-6 text-primary" /></div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">Next trip</p>
                  <p className="font-display text-lg font-bold">{nextTrip.trip.origin} → {nextTrip.trip.destination}</p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(nextTrip.trip.departure_time)} · {nextTrip.seats_booked} seat(s) · Ref {nextTrip.booking_reference}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {waLink(nextTrip.trip.driver?.phone) && (
                  <a href={waLink(nextTrip.trip.driver?.phone, `Hello, about my ${nextTrip.trip.origin} → ${nextTrip.trip.destination} trip.`)!} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="gap-1.5 bg-[#25D366] text-white hover:brightness-95"><MessageCircle className="h-4 w-4" /> Driver</Button>
                  </a>
                )}
                <Button size="sm" variant="outline" onClick={() => router.push(`/trip?id=${nextTrip.trip!.id}`)}>Details</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Ticket} label="Total bookings" value={String(bookings.length)} tint="bg-primary/10 text-primary" />
          <Stat icon={Calendar} label="Upcoming trips" value={String(upcoming.length)} tint="bg-accent/10 text-accent" />
          <Stat icon={CheckCircle2} label="Completed" value={String(past.filter((b) => b.status !== 'cancelled').length)} tint="bg-success/10 text-success" />
          <Stat icon={Wallet} label="Total spent" value={formatNaira(totalSpent)} tint="bg-warning/10 text-warning" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left column */}
          <div className="space-y-6">
            {/* Spending chart */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5" /> Spending (last 6 months)</CardTitle>
                <span className="font-display text-lg font-bold text-primary">{formatNaira(totalSpent)}</span>
              </CardHeader>
              <CardContent>
                <div className="h-56 w-full">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={spendData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : `${v}`)} tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" width={44} />
                        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} formatter={(v: any) => [formatNaira(Number(v)), 'Spent']} contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                        <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                          {spendData.map((_, i) => <Cell key={i} fill={GREEN} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming trips */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Upcoming Trips</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {upcoming.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <MapPin className="h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 font-medium">No upcoming trips</p>
                    <p className="text-sm text-muted-foreground">Search for your next journey.</p>
                    <Button className="mt-4 gap-2" onClick={() => router.push('/search')}><Search className="h-4 w-4" /> Find a trip</Button>
                  </div>
                ) : upcoming.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-xl border border-border/60 p-4 transition hover:shadow-sm">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11"><AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{b.trip?.driver?.full_name?.[0] ?? 'D'}</AvatarFallback></Avatar>
                      <div>
                        <p className="font-semibold">{b.trip?.origin} → {b.trip?.destination}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(b.trip?.departure_time || '')} · {b.trip?.driver?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{b.seats_booked} seat(s) · Ref {b.booking_reference}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-primary">{formatNaira(b.total_amount)}</p>
                      <Badge className="mt-1 bg-success/10 text-success">{BOOKING_STATUS_LABELS[b.status]}</Badge>
                      <button onClick={() => router.push(`/receipt?id=${b.id}`)} className="mt-1 block text-xs font-medium text-primary hover:underline">Receipt →</button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* History */}
            {past.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Trip History</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {past.slice(0, 8).map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium">{b.trip?.origin} → {b.trip?.destination}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(b.trip?.departure_time || '')} · Ref {b.booking_reference}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatNaira(b.total_amount)}</span>
                        <Badge variant="outline" className="capitalize">{BOOKING_STATUS_LABELS[b.status]}</Badge>
                        <button onClick={() => router.push(`/receipt?id=${b.id}`)} className="text-xs font-medium text-primary hover:underline">Receipt</button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Traveller level */}
            <Card>
              <CardHeader><CardTitle className="text-base">Traveller status</CardTitle></CardHeader>
              <CardContent>
                {(() => {
                  const trips = past.filter((b) => b.status !== 'cancelled').length + upcoming.length;
                  const tiers = [
                    { name: 'Bronze', min: 0 }, { name: 'Silver', min: 5 }, { name: 'Gold', min: 15 }, { name: 'Platinum', min: 30 },
                  ];
                  const idx = Math.max(0, tiers.map((t) => trips >= t.min).lastIndexOf(true));
                  const next = tiers[idx + 1];
                  const pct = next ? Math.min(100, Math.round(((trips - tiers[idx].min) / (next.min - tiers[idx].min)) * 100)) : 100;
                  return (
                    <>
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 fill-warning text-warning" />
                        <span className="font-display text-lg font-bold">{tiers[idx].name} traveller</span>
                      </div>
                      <div className="mt-3"><Meter value={pct} /></div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {next ? `${next.min - trips} more trip(s) to ${next.name}` : 'Top tier reached — nice!'}
                      </p>
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Saved routes */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Saved routes</CardTitle>
                <Repeat className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                {savedRoutes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No saved routes yet. Save your favourites from search.</p>
                ) : savedRoutes.map((r) => (
                  <button key={r.id} onClick={() => router.push(`/search?origin=${encodeURIComponent(r.origin)}&destination=${encodeURIComponent(r.destination)}`)}
                    className="flex w-full items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm transition hover:border-primary/40 hover:bg-secondary/50">
                    <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" />{r.origin} → {r.destination}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader><CardTitle className="text-base">Quick actions</CardTitle></CardHeader>
              <CardContent className="grid gap-2">
                <Button variant="outline" className="justify-start gap-2" onClick={() => router.push('/search')}><Search className="h-4 w-4" /> Search trips</Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => router.push('/profile')}><Ticket className="h-4 w-4" /> My profile</Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => router.push('/how-it-works')}><ArrowRight className="h-4 w-4" /> How it works</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
