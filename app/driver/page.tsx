'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { formatNaira, formatDateTime, TRIP_STATUS_LABELS, KYC_STATUS_LABELS } from '@/lib/constants';
import { Trip, Booking } from '@/lib/types';
import {
  Plus, Car, Calendar, Users, Wallet, Star, ShieldCheck, TrendingUp, ArrowRight,
  Clock, Banknote, PiggyBank, AlertCircle, CheckCircle2, ClipboardList,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

function Meter({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

const GREEN = 'hsl(152 76% 36%)';
const COMMISSION = 0.10; // 10% platform fee

function Stat({ icon: Icon, label, value, tint, sub }: { icon: any; label: string; value: string; tint: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint}`}><Icon className="h-5 w-5" /></div>
          <div>
            <p className="font-display text-2xl font-bold leading-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DriverDashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<(Booking & { trip?: Trip | null })[]>([]);
  const [passengerNames, setPassengerNames] = useState<Record<string, string>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!loading && profile && profile.role !== 'driver') { router.push('/dashboard'); return; }
    if (!user) return;
    const load = async () => {
      const { data: tripsData } = await supabase.from('trips').select('*').eq('driver_id', user.id).order('departure_time', { ascending: false });
      const t = (tripsData || []) as Trip[];
      setTrips(t);
      const tripIds = t.map((x) => x.id);
      if (tripIds.length) {
        const { data: bData } = await supabase
          .from('bookings')
          .select('*, trip:trips!bookings_trip_id_fkey(*)')
          .in('trip_id', tripIds)
          .order('created_at', { ascending: false });
        const bs = (bData || []) as any[];
        setBookings(bs);
        // fetch passenger names for confirmed bookings
        const paxIds = Array.from(new Set(bs.map((b) => b.passenger_id)));
        if (paxIds.length) {
          const { data: pax } = await supabase.from('profiles').select('id, full_name').in('id', paxIds);
          const map: Record<string, string> = {};
          (pax || []).forEach((p: any) => { map[p.id] = p.full_name; });
          setPassengerNames(map);
        }
      }
      setLoadingData(false);
    };
    load();
  }, [user, profile, loading, router]);

  const now = Date.now();
  const upcomingTrips = useMemo(() => trips.filter((t) => t.status === 'scheduled' && new Date(t.departure_time).getTime() > now), [trips]);
  const pastTrips = useMemo(() => trips.filter((t) => !(t.status === 'scheduled' && new Date(t.departure_time).getTime() > now)), [trips]);

  const paidBookings = useMemo(() => bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed'), [bookings]);
  const grossEarnings = useMemo(() => paidBookings.reduce((s, b) => s + (b.total_amount || 0), 0), [paidBookings]);
  const netEarnings = Math.floor(grossEarnings * (1 - COMMISSION));

  // pending = future trips' bookings (held); available = completed
  const pending = useMemo(() => bookings.filter((b) => b.status === 'confirmed' && b.trip && new Date(b.trip.departure_time).getTime() > now).reduce((s, b) => s + Math.floor((b.total_amount || 0) * (1 - COMMISSION)), 0), [bookings]);
  const available = Math.max(0, netEarnings - pending);

  const totalSeatsBooked = useMemo(() => trips.reduce((s, t) => s + (t.total_seats - t.available_seats), 0), [trips]);

  // Earnings over last 6 months (net)
  const earnData = useMemo(() => {
    const buckets: { key: string; label: string; total: number }[] = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
      buckets.push({ key: `${dt.getFullYear()}-${dt.getMonth()}`, label: dt.toLocaleString('en-NG', { month: 'short' }), total: 0 });
    }
    for (const b of paidBookings) {
      const dt = new Date(b.created_at);
      const k = `${dt.getFullYear()}-${dt.getMonth()}`;
      const bucket = buckets.find((x) => x.key === k);
      if (bucket) bucket.total += Math.floor((b.total_amount || 0) * (1 - COMMISSION));
    }
    return buckets;
  }, [paidBookings]);

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

  const verified = profile?.is_verified_driver;

  return (
    <div className="min-h-screen"><Navbar />
      <div className="container py-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold sm:text-3xl">Driver Dashboard</h1>
              {verified && <Badge className="gap-1 bg-success/10 text-success"><ShieldCheck className="h-3 w-3" /> Verified</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{profile?.full_name} · KYC: {profile ? KYC_STATUS_LABELS[profile.kyc_status] : '—'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => router.push('/driver/bookings')}><ClipboardList className="h-4 w-4" /> Bookings</Button>
            <Button variant="outline" className="gap-2" onClick={() => router.push('/driver/payouts')}><Wallet className="h-4 w-4" /> Wallet</Button>
            <Button variant="outline" className="gap-2" onClick={() => router.push('/driver/vehicles')}><Car className="h-4 w-4" /> Vehicles</Button>
            <Button className="gap-2" onClick={() => router.push('/driver/trips/new')}><Plus className="h-4 w-4" /> Create Trip</Button>
          </div>
        </div>

        {/* KYC banner */}
        {!verified && (
          <Card className="mb-6 border-warning/30 bg-warning/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-warning" />
                <div>
                  <p className="font-semibold">Complete your verification</p>
                  <p className="text-sm text-muted-foreground">
                    {profile?.kyc_status === 'pending' ? 'Your documents are under review — we\u2019ll notify you within 48 hours.' : 'Submit your NIN and documents to earn the Verified badge and start receiving bookings.'}
                  </p>
                </div>
              </div>
              {profile?.kyc_status !== 'pending' && (
                <Button className="gap-2" onClick={() => router.push('/driver/verification')}><ShieldCheck className="h-4 w-4" /> Verify now</Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Wallet strip */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary"><Wallet className="h-4 w-4" /> Available to withdraw</div>
              <p className="mt-1 font-display text-3xl font-bold text-primary">{formatNaira(available)}</p>
              <Button size="sm" className="mt-3 gap-1.5" disabled={available <= 0}><Banknote className="h-4 w-4" /> Request payout</Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Clock className="h-4 w-4" /> Pending (held)</div>
              <p className="mt-1 font-display text-2xl font-bold">{formatNaira(pending)}</p>
              <p className="text-[11px] text-muted-foreground">Released after trips complete</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><PiggyBank className="h-4 w-4" /> Lifetime earnings</div>
              <p className="mt-1 font-display text-2xl font-bold">{formatNaira(netEarnings)}</p>
              <p className="text-[11px] text-muted-foreground">Net of {Math.round(COMMISSION * 100)}% platform fee</p>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Calendar} label="Upcoming trips" value={String(upcomingTrips.length)} tint="bg-accent/10 text-accent" />
          <Stat icon={Users} label="Seats booked" value={String(totalSeatsBooked)} tint="bg-primary/10 text-primary" />
          <Stat icon={CheckCircle2} label="Completed trips" value={String(pastTrips.filter((t) => t.status !== 'cancelled').length)} tint="bg-success/10 text-success" />
          <Stat icon={Star} label="Your rating" value={profile?.rating ? profile.rating.toFixed(1) : '—'} sub={`${profile?.rating_count ?? 0} reviews`} tint="bg-warning/10 text-warning" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Left */}
          <div className="space-y-6">
            {/* Earnings chart */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5" /> Earnings (last 6 months)</CardTitle>
                <span className="font-display text-lg font-bold text-primary">{formatNaira(netEarnings)}</span>
              </CardHeader>
              <CardContent>
                <div className="h-56 w-full">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={earnData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                        <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GREEN} stopOpacity={0.35} /><stop offset="100%" stopColor={GREEN} stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : `${v}`)} tickLine={false} axisLine={false} fontSize={12} width={44} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip formatter={(v: any) => [formatNaira(Number(v)), 'Net']} contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                        <Area type="monotone" dataKey="total" stroke={GREEN} strokeWidth={2} fill="url(#g)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Trips tabs */}
            <Card>
              <CardHeader><CardTitle className="text-lg">My Trips</CardTitle></CardHeader>
              <CardContent>
                <Tabs defaultValue="upcoming">
                  <TabsList>
                    <TabsTrigger value="upcoming">Upcoming ({upcomingTrips.length})</TabsTrigger>
                    <TabsTrigger value="history">History ({pastTrips.length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="upcoming" className="mt-4 space-y-3">
                    {upcomingTrips.length === 0 ? (
                      <div className="flex flex-col items-center py-10 text-center">
                        <Car className="h-10 w-10 text-muted-foreground" />
                        <p className="mt-3 font-medium">No upcoming trips</p>
                        <p className="text-sm text-muted-foreground">Create a trip to start earning.</p>
                        <Button className="mt-4 gap-2" onClick={() => router.push('/driver/trips/new')}><Plus className="h-4 w-4" /> Create Trip</Button>
                      </div>
                    ) : upcomingTrips.map((t) => {
                      const filled = t.total_seats - t.available_seats;
                      const pct = Math.round((filled / t.total_seats) * 100);
                      return (
                        <div key={t.id} className="rounded-xl border border-border/60 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{t.origin} → {t.destination}</p>
                              <p className="text-xs text-muted-foreground">{formatDateTime(t.departure_time)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-display font-bold text-primary">{formatNaira(t.price_per_seat)}</p>
                              <Badge variant="outline" className="mt-1 capitalize">{TRIP_STATUS_LABELS[t.status]}</Badge>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                              <span>{filled}/{t.total_seats} seats booked</span><span>{formatNaira(filled * t.price_per_seat)} gross</span>
                            </div>
                            <Meter value={pct} />
                          </div>
                        </div>
                      );
                    })}
                  </TabsContent>
                  <TabsContent value="history" className="mt-4 space-y-2">
                    {pastTrips.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">No trip history yet.</p>
                    ) : pastTrips.map((t) => (
                      <div key={t.id} className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3 text-sm">
                        <div>
                          <p className="font-medium">{t.origin} → {t.destination}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(t.departure_time)}</p>
                        </div>
                        <Badge variant="outline" className="capitalize">{TRIP_STATUS_LABELS[t.status]}</Badge>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right */}
          <div className="space-y-6">
            {/* Recent passengers */}
            <Card>
              <CardHeader><CardTitle className="text-base">Recent passengers</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {paidBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bookings yet.</p>
                ) : paidBookings.slice(0, 6).map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">{(passengerNames[b.passenger_id] || 'P')[0]}</AvatarFallback></Avatar>
                      <div>
                        <p className="text-sm font-medium">{passengerNames[b.passenger_id] || 'Passenger'}</p>
                        <p className="text-[11px] text-muted-foreground">{b.trip?.origin} → {b.trip?.destination} · {b.seats_booked} seat(s)</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{formatNaira(b.total_amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader><CardTitle className="text-base">Quick actions</CardTitle></CardHeader>
              <CardContent className="grid gap-2">
                <Button variant="outline" className="justify-start gap-2" onClick={() => router.push('/driver/bookings')}><ClipboardList className="h-4 w-4" /> Bookings & requests</Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => router.push('/driver/payouts')}><Wallet className="h-4 w-4" /> Wallet & payouts</Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => router.push('/driver/trips/new')}><Plus className="h-4 w-4" /> Publish a trip</Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => router.push('/driver/vehicles')}><Car className="h-4 w-4" /> Manage vehicles</Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => router.push('/driver/verification')}><ShieldCheck className="h-4 w-4" /> Verification</Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => router.push('/profile')}><ArrowRight className="h-4 w-4" /> Profile & payout</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
