'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { formatNaira, formatDateTime, KYC_STATUS_LABELS } from '@/lib/constants';
import {
  Users, Car, Calendar, ShieldCheck, CheckCircle2, XCircle, Loader2, TrendingUp,
  Wallet, Ticket, BadgeCheck, Building2, Ban, RotateCcw, Undo2,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const GREEN = 'hsl(152 76% 36%)';
const PIE = ['hsl(152 76% 36%)', 'hsl(38 92% 50%)', 'hsl(197 70% 45%)', 'hsl(0 70% 55%)'];

type AdminProfile = { id: string; full_name: string; role: string; kyc_status: string; is_verified_driver: boolean; created_at: string };
type AdminVehicle = { id: string; make: string; model: string; year: number; plate_number: string; status: string; created_at: string; driver: { full_name: string } | null };
type AdminTrip = { id: string; origin: string; destination: string; departure_time: string; price_per_seat: number; total_seats: number; available_seats: number; status: string; created_at: string; driver: { full_name: string } | null };
type AdminBooking = { id: string; total_amount: number; seats_booked: number; status: string; booking_reference: string; created_at: string };

function Stat({ icon: Icon, label, value, tint }: { icon: any; label: string; value: string; tint: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint}`}><Icon className="h-5 w-5" /></div>
          <div><p className="font-display text-2xl font-bold leading-tight">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [drivers, setDrivers] = useState<AdminProfile[]>([]);
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [trips, setTrips] = useState<AdminTrip[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [passengerCount, setPassengerCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!loading && profile && profile.role !== 'admin') { router.push('/dashboard'); return; }
    if (!user) return;
    const load = async () => {
      const [{ data: d }, { data: v }, { data: t }, { data: b }, { count: pc }] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'driver').order('created_at', { ascending: false }),
        supabase.from('vehicles').select('*, driver:profiles!vehicles_driver_id_fkey(full_name)').order('created_at', { ascending: false }),
        supabase.from('trips').select('*, driver:profiles!trips_driver_id_fkey(full_name)').order('created_at', { ascending: false }).limit(50),
        supabase.from('bookings').select('id, total_amount, seats_booked, status, payment_status, booking_reference, created_at, trip_id').order('created_at', { ascending: false }).limit(200),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'passenger'),
      ]);
      setDrivers((d || []) as AdminProfile[]);
      setVehicles((v || []) as AdminVehicle[]);
      setTrips((t || []) as AdminTrip[]);
      setBookings((b || []) as AdminBooking[]);
      setPassengerCount(pc || 0);
      setLoadingData(false);
    };
    load();
  }, [user, profile, loading, router]);

  const pendingDrivers = useMemo(() => drivers.filter((d) => d.kyc_status === 'pending'), [drivers]);
  const verifiedDrivers = useMemo(() => drivers.filter((d) => d.is_verified_driver).length, [drivers]);
  const pendingVehicles = useMemo(() => vehicles.filter((v) => v.status === 'pending'), [vehicles]);
  const paidBookings = useMemo(() => bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed'), [bookings]);
  const gmv = useMemo(() => paidBookings.reduce((s, b) => s + (b.total_amount || 0), 0), [paidBookings]);
  const revenue = Math.floor(gmv * 0.10);

  // GMV trend (last 6 months)
  const gmvData = useMemo(() => {
    const buckets: { key: string; label: string; total: number }[] = [];
    const dd = new Date();
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(dd.getFullYear(), dd.getMonth() - i, 1);
      buckets.push({ key: `${dt.getFullYear()}-${dt.getMonth()}`, label: dt.toLocaleString('en-NG', { month: 'short' }), total: 0 });
    }
    for (const b of paidBookings) {
      const dt = new Date(b.created_at);
      const k = `${dt.getFullYear()}-${dt.getMonth()}`;
      const bucket = buckets.find((x) => x.key === k);
      if (bucket) bucket.total += (b.total_amount || 0);
    }
    return buckets;
  }, [paidBookings]);

  // Trips by status (pie)
  const tripStatusData = useMemo(() => {
    const m: Record<string, number> = {};
    trips.forEach((t) => { m[t.status] = (m[t.status] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
  }, [trips]);

  const approveDriver = async (id: string) => {
    setActing(id);
    // guard trigger allows admins; ensure your account role='admin'
    const { error } = await supabase.from('profiles').update({ kyc_status: 'verified', is_verified_driver: true }).eq('id', id);
    setActing(null);
    if (error) { toast.error(error.message); return; }
    setDrivers((ds) => ds.map((d) => (d.id === id ? { ...d, kyc_status: 'verified', is_verified_driver: true } : d)));
    toast.success('Driver verified');
  };
  const rejectDriver = async (id: string) => {
    setActing(id);
    const { error } = await supabase.from('profiles').update({ kyc_status: 'rejected', is_verified_driver: false }).eq('id', id);
    setActing(null);
    if (error) { toast.error(error.message); return; }
    setDrivers((ds) => ds.map((d) => (d.id === id ? { ...d, kyc_status: 'rejected', is_verified_driver: false } : d)));
    toast.success('Driver rejected');
  };
  const setVehicle = async (id: string, status: 'approved' | 'rejected') => {
    setActing(id);
    const { error } = await supabase.from('vehicles').update({ status }).eq('id', id);
    setActing(null);
    if (error) { toast.error(error.message); return; }
    setVehicles((vs) => vs.map((v) => (v.id === id ? { ...v, status } : v)));
    toast.success(`Vehicle ${status}`);
  };

  const setAccount = async (id: string, status: 'active' | 'suspended' | 'banned') => {
    setActing(id);
    const { error } = await supabase.rpc('admin_set_account_status', { p_user: id, p_status: status });
    setActing(null);
    if (error) { toast.error(error.message); return; }
    setDrivers((ds) => ds.map((d) => (d.id === id ? { ...d, account_status: status } : d)));
    toast.success(`Account ${status}`);
  };

  const cancelTrip = async (id: string) => {
    if (!confirm('Cancel this trip? Active bookings will be cancelled and passengers notified.')) return;
    setActing(id);
    const { error } = await supabase.rpc('admin_cancel_trip', { p_trip: id, p_reason: null });
    setActing(null);
    if (error) { toast.error(error.message); return; }
    setTrips((ts) => ts.map((t) => (t.id === id ? { ...t, status: 'cancelled' } : t)));
    toast.success('Trip cancelled');
  };

  const refundBooking = async (id: string) => {
    if (!confirm('Refund this booking? Driver earnings are reversed and seats released.')) return;
    setActing(id);
    const { error } = await supabase.rpc('admin_refund_booking', { p_booking: id, p_amount: null, p_ref: null });
    setActing(null);
    if (error) { toast.error(error.message); return; }
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status: 'refunded', payment_status: 'refunded' } : b)));
    toast.success('Booking refunded');
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen"><Navbar />
        <div className="container py-8 space-y-6">
          <Skeleton className="h-9 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen"><Navbar />
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage the NaijaRide platform.</p>
        </div>

        {/* Top stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Wallet} label="Platform revenue (10%)" value={formatNaira(revenue)} tint="bg-primary/10 text-primary" />
          <Stat icon={TrendingUp} label="Gross booking value" value={formatNaira(gmv)} tint="bg-success/10 text-success" />
          <Stat icon={Ticket} label="Paid bookings" value={String(paidBookings.length)} tint="bg-accent/10 text-accent" />
          <Stat icon={Calendar} label="Total trips" value={String(trips.length)} tint="bg-warning/10 text-warning" />
          <Stat icon={Users} label="Passengers" value={String(passengerCount)} tint="bg-primary/10 text-primary" />
          <Stat icon={Building2} label="Drivers" value={String(drivers.length)} tint="bg-accent/10 text-accent" />
          <Stat icon={BadgeCheck} label="Verified drivers" value={String(verifiedDrivers)} tint="bg-success/10 text-success" />
          <Stat icon={ShieldCheck} label="Pending approvals" value={String(pendingDrivers.length + pendingVehicles.length)} tint="bg-warning/10 text-warning" />
        </div>

        {/* Charts */}
        <div className="mb-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5" /> Booking value (6 months)</CardTitle>
              <span className="font-display text-lg font-bold text-primary">{formatNaira(gmv)}</span>
            </CardHeader>
            <CardContent>
              <div className="h-56 w-full">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={gmvData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GREEN} stopOpacity={0.35} /><stop offset="100%" stopColor={GREEN} stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : `${v}`)} tickLine={false} axisLine={false} fontSize={12} width={44} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip formatter={(v: any) => [formatNaira(Number(v)), 'GMV']} contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                      <Area type="monotone" dataKey="total" stroke={GREEN} strokeWidth={2} fill="url(#ag)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Trips by status</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56 w-full">
                {mounted && tripStatusData.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={tripStatusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>
                        {tripStatusData.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                      </Pie>
                      <Legend verticalAlign="bottom" height={24} formatter={(val) => <span className="text-xs capitalize text-muted-foreground">{val}</span>} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management tabs */}
        <Tabs defaultValue="drivers">
          <TabsList>
            <TabsTrigger value="drivers">Drivers {pendingDrivers.length > 0 && <Badge className="ml-1.5 bg-accent/20 text-accent">{pendingDrivers.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles {pendingVehicles.length > 0 && <Badge className="ml-1.5 bg-accent/20 text-accent">{pendingVehicles.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="trips">Trips ({trips.length})</TabsTrigger>
            <TabsTrigger value="bookings">Bookings ({bookings.length})</TabsTrigger>
          </TabsList>

          {/* Drivers */}
          <TabsContent value="drivers" className="mt-4 space-y-3">
            {drivers.length === 0 ? <Empty text="No drivers registered yet." /> : drivers.map((d) => (
              <Card key={d.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{d.full_name?.[0] ?? 'D'}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-sm font-semibold">{d.full_name || 'Unnamed'}</p>
                      <p className="text-xs text-muted-foreground">Joined {new Date(d.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={d.kyc_status === 'verified' ? 'bg-success/10 text-success' : d.kyc_status === 'pending' ? 'bg-accent/10 text-accent' : d.kyc_status === 'rejected' ? 'bg-destructive/10 text-destructive' : ''}>{KYC_STATUS_LABELS[d.kyc_status]}</Badge>
                    {d.kyc_status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" className="gap-1.5" disabled={acting === d.id} onClick={() => approveDriver(d.id)}>{acting === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve</Button>
                        <Button size="sm" variant="outline" className="gap-1.5 text-destructive" disabled={acting === d.id} onClick={() => rejectDriver(d.id)}><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                      </>
                    )}
                    {(d as any).account_status === 'active' || !(d as any).account_status ? (
                      <>
                        <Button size="sm" variant="outline" className="gap-1.5" disabled={acting === d.id} onClick={() => setAccount(d.id, 'suspended')}><Ban className="h-3.5 w-3.5" /> Suspend</Button>
                        <Button size="sm" variant="outline" className="gap-1.5 text-destructive" disabled={acting === d.id} onClick={() => setAccount(d.id, 'banned')}>Ban</Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1.5" disabled={acting === d.id} onClick={() => setAccount(d.id, 'active')}><RotateCcw className="h-3.5 w-3.5" /> Reactivate</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Vehicles */}
          <TabsContent value="vehicles" className="mt-4 space-y-3">
            {vehicles.length === 0 ? <Empty text="No vehicles registered yet." /> : vehicles.map((v) => (
              <Card key={v.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary"><Car className="h-5 w-5 text-muted-foreground" /></div>
                    <div>
                      <p className="text-sm font-semibold">{v.make} {v.model} ({v.year})</p>
                      <p className="text-xs text-muted-foreground">{v.plate_number} · {v.driver?.full_name ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={v.status === 'approved' ? 'bg-success/10 text-success' : v.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'}>{v.status}</Badge>
                    {v.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" className="gap-1.5" disabled={acting === v.id} onClick={() => setVehicle(v.id, 'approved')}>{acting === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve</Button>
                        <Button size="sm" variant="outline" className="gap-1.5 text-destructive" disabled={acting === v.id} onClick={() => setVehicle(v.id, 'rejected')}><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Trips */}
          <TabsContent value="trips" className="mt-4 space-y-2">
            {trips.length === 0 ? <Empty text="No trips published yet." /> : trips.map((t) => (
              <Card key={t.id}><CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold">{t.origin} → {t.destination}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(t.departure_time)} · {t.driver?.full_name ?? '—'} · {t.total_seats - t.available_seats}/{t.total_seats} booked</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary">{formatNaira(t.price_per_seat)}</span>
                  <Badge variant="outline" className="capitalize">{t.status.replace('_', ' ')}</Badge>
                  {['scheduled','in_progress'].includes(t.status) && (
                    <Button size="sm" variant="outline" className="gap-1.5 text-destructive" disabled={acting === t.id} onClick={() => cancelTrip(t.id)}>{acting === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} Cancel</Button>
                  )}
                </div>
              </CardContent></Card>
            ))}
          </TabsContent>

          {/* Bookings */}
          <TabsContent value="bookings" className="mt-4 space-y-2">
            {bookings.length === 0 ? <Empty text="No bookings yet." /> : bookings.slice(0, 40).map((b) => (
              <Card key={b.id}><CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold">Ref {b.booking_reference}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(b.created_at)} · {b.seats_booked} seat(s)</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{formatNaira(b.total_amount)}</span>
                  <Badge variant="outline" className="capitalize">{b.status}</Badge>
                  {(b as any).payment_status === 'paid' && b.status !== 'refunded' && (
                    <Button size="sm" variant="outline" className="gap-1.5 text-destructive" disabled={acting === b.id} onClick={() => refundBooking(b.id)}>{acting === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />} Refund</Button>
                  )}
                </div>
              </CardContent></Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <Card className="border-dashed"><CardContent className="py-12 text-center text-sm text-muted-foreground">{text}</CardContent></Card>;
}
