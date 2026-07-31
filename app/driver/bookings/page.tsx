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
import { formatNaira, formatDateTime } from '@/lib/constants';
import {
  CheckCircle2, XCircle, Loader2, Play, Flag, Users, Clock, MessageCircle, Inbox,
} from 'lucide-react';

type Row = {
  id: string; seats_booked: number; total_amount: number; status: string; payment_status: string;
  booking_reference: string; created_at: string; passenger_id: string; trip_id: string;
  trip?: { origin: string; destination: string; departure_time: string; status: string } | null;
  passenger?: { full_name: string; phone: string | null } | null;
};

function wa(phone?: string | null, msg = '') {
  if (!phone) return null;
  let p = phone.replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '234' + p.slice(1);
  return `https://wa.me/${p}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`;
}

export default function DriverBookingsPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data: trips } = await supabase.from('trips').select('id').eq('driver_id', user.id);
    const ids = (trips || []).map((t: any) => t.id);
    if (!ids.length) { setRows([]); setLoadingData(false); return; }
    const { data } = await supabase
      .from('bookings')
      .select('*, trip:trips!bookings_trip_id_fkey(origin,destination,departure_time,status)')
      .in('trip_id', ids)
      .order('created_at', { ascending: false });
    const bs = (data || []) as unknown as Row[];
    const paxIds = Array.from(new Set(bs.map((b) => b.passenger_id)));
    if (paxIds.length) {
      const { data: pax } = await supabase.from('profiles').select('id, full_name, phone').in('id', paxIds);
      const map: Record<string, any> = {};
      (pax || []).forEach((p: any) => { map[p.id] = p; });
      bs.forEach((b) => { b.passenger = map[b.passenger_id]; });
    }
    setRows(bs);
    setLoadingData(false);
  };

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!loading && profile && profile.role !== 'driver') { router.push('/dashboard'); return; }
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, loading]);

  const call = async (fn: string, args: any, ok: string) => {
    setActing(args.p_booking_id || args.p_trip_id);
    const { error } = await supabase.rpc(fn, args);
    setActing(null);
    if (error) { toast.error(error.message); return; }
    toast.success(ok);
    load();
  };

  const requests = useMemo(() => rows.filter((r) => r.status === 'pending'), [rows]);
  const accepted = useMemo(() => rows.filter((r) => r.status === 'accepted'), [rows]);
  const confirmed = useMemo(() => rows.filter((r) => r.status === 'confirmed'), [rows]); // paid — show contact
  const done = useMemo(() => rows.filter((r) => ['completed', 'cancelled', 'rejected', 'refunded'].includes(r.status)), [rows]);

  if (loading || loadingData) {
    return <div className="min-h-screen"><Navbar /><div className="container py-8 space-y-4"><Skeleton className="h-9 w-56" /><Skeleton className="h-40" /></div></div>;
  }

  const Item = ({ r, actions }: { r: Row; actions?: React.ReactNode }) => (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary/10 text-primary text-xs">{(r.passenger?.full_name || 'P')[0]}</AvatarFallback></Avatar>
          <div>
            <p className="text-sm font-semibold">{r.passenger?.full_name || 'Passenger'} · {r.seats_booked} seat(s)</p>
            <p className="text-xs text-muted-foreground">{r.trip?.origin} → {r.trip?.destination} · {formatDateTime(r.trip?.departure_time || '')}</p>
            <p className="text-xs text-muted-foreground">Ref {r.booking_reference} · {r.payment_status}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-primary">{formatNaira(r.total_amount)}</span>
          {actions}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen"><Navbar />
      <div className="container py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Bookings</h1>
            <p className="text-sm text-muted-foreground">Accept requests, then manage trips through to completion.</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/driver')}>Dashboard</Button>
        </div>

        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests">Requests {requests.length > 0 && <Badge className="ml-1.5 bg-accent/20 text-accent">{requests.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="accepted">Awaiting payment ({accepted.length})</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed ({confirmed.length})</TabsTrigger>
            <TabsTrigger value="done">History ({done.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-4 space-y-3">
            {requests.length === 0 ? <Empty text="No pending requests." /> : requests.map((r) => (
              <Item key={r.id} r={r} actions={
                <>
                  <Button size="sm" variant="outline" className="gap-1.5" disabled={acting === r.id} onClick={() => call('accept_booking', { p_booking_id: r.id }, 'Booking accepted')}>
                    {acting === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Accept
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-destructive" disabled={acting === r.id} onClick={() => call('reject_booking', { p_booking_id: r.id }, 'Booking rejected')}>
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </Button>
                </>
              } />
            ))}
          </TabsContent>

          <TabsContent value="accepted" className="mt-4 space-y-3">
            {accepted.length === 0 ? <Empty text="Nothing awaiting payment." /> : accepted.map((r) => (
              <Item key={r.id} r={r} actions={<Badge className="bg-accent/10 text-accent gap-1"><Clock className="h-3 w-3" /> Awaiting payment</Badge>} />
            ))}
          </TabsContent>

          <TabsContent value="confirmed" className="mt-4 space-y-3">
            {confirmed.length === 0 ? <Empty text="No confirmed bookings yet." /> : confirmed.map((r) => (
              <Item key={r.id} r={r} actions={
                <>
                  {wa(r.passenger?.phone) && (
                    <a href={wa(r.passenger?.phone, `Hello ${r.passenger?.full_name ?? ''}, about your NaijaRide trip.`)!} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="gap-1.5 bg-[#25D366] text-white hover:brightness-95"><MessageCircle className="h-3.5 w-3.5" /> Contact</Button>
                    </a>
                  )}
                  <Badge className="bg-success/10 text-success gap-1"><CheckCircle2 className="h-3 w-3" /> Paid</Badge>
                </>
              } />
            ))}
          </TabsContent>

          <TabsContent value="done" className="mt-4 space-y-2">
            {done.length === 0 ? <Empty text="No history yet." /> : done.map((r) => (
              <Item key={r.id} r={r} actions={<Badge variant="outline" className="capitalize">{r.status}</Badge>} />
            ))}
          </TabsContent>
        </Tabs>

        {/* Trip lifecycle helper */}
        <Card className="mt-8">
          <CardHeader><CardTitle className="text-lg">Trip actions</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">Start or complete your scheduled trips. Completing a trip releases held earnings to your withdrawable balance.</p>
            <TripActions driverId={user!.id} onChange={load} acting={acting} setActing={setActing} />
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}

function TripActions({ driverId, onChange, acting, setActing }: { driverId: string; onChange: () => void; acting: string | null; setActing: (v: string | null) => void }) {
  const [trips, setTrips] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('trips').select('id,origin,destination,departure_time,status').eq('driver_id', driverId)
      .in('status', ['scheduled', 'in_progress']).order('departure_time', { ascending: true })
      .then(({ data }) => setTrips(data || []));
  }, [driverId]);

  const set = async (id: string, status: string, ok: string) => {
    setActing(id);
    const { error } = await supabase.rpc('set_trip_status', { p_trip_id: id, p_status: status });
    setActing(null);
    if (error) { toast.error(error.message); return; }
    toast.success(ok);
    setTrips((ts) => ts.filter((t) => t.id !== id || status !== 'completed'));
    onChange();
  };

  if (!trips.length) return <p className="text-sm text-muted-foreground">No active trips.</p>;
  return (
    <div className="space-y-2">
      {trips.map((t) => (
        <div key={t.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
          <div>
            <p className="font-medium">{t.origin} → {t.destination}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(t.departure_time)} · {t.status.replace('_', ' ')}</p>
          </div>
          <div className="flex gap-2">
            {t.status === 'scheduled' && (
              <Button size="sm" variant="outline" className="gap-1.5" disabled={acting === t.id} onClick={() => set(t.id, 'in_progress', 'Trip started')}>
                {acting === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Start
              </Button>
            )}
            <Button size="sm" className="gap-1.5" disabled={acting === t.id} onClick={() => set(t.id, 'completed', 'Trip completed — earnings released')}>
              {acting === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />} Complete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <Card className="border-dashed"><CardContent className="flex flex-col items-center py-12 text-center text-sm text-muted-foreground"><Inbox className="mb-2 h-8 w-8" />{text}</CardContent></Card>;
}
