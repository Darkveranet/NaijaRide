'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { formatNaira, formatDateTime, KYC_STATUS_LABELS } from '@/lib/constants';
import {
  Users,
  Car,
  Calendar,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
} from 'lucide-react';

type AdminProfile = {
  id: string;
  full_name: string;
  role: string;
  kyc_status: string;
  is_verified_driver: boolean;
  created_at: string;
};
type AdminVehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  plate_number: string;
  status: string;
  driver: { full_name: string } | null;
};
type AdminTrip = {
  id: string;
  origin: string;
  destination: string;
  departure_time: string;
  price_per_seat: number;
  total_seats: number;
  available_seats: number;
  status: string;
  driver: { full_name: string } | null;
};

export default function AdminPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [drivers, setDrivers] = useState<AdminProfile[]>([]);
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [trips, setTrips] = useState<AdminTrip[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!loading && profile && profile.role !== 'admin') { router.push('/dashboard'); return; }
    if (!user) return;

    const load = async () => {
      const [{ data: d }, { data: v }, { data: t }] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'driver').order('created_at', { ascending: false }),
        supabase.from('vehicles').select('*, driver:profiles!vehicles_driver_id_fkey(full_name)').order('created_at', { ascending: false }),
        supabase.from('trips').select('*, driver:profiles!trips_driver_id_fkey(full_name)').order('departure_time', { ascending: false }).limit(20),
      ]);
      setDrivers((d || []) as AdminProfile[]);
      setVehicles((v || []) as AdminVehicle[]);
      setTrips((t || []) as AdminTrip[]);
      setLoadingData(false);
    };
    load();
  }, [user, profile, loading, router]);

  const approveVehicle = async (id: string) => {
    setActing(id);
    const { error } = await supabase.from('vehicles').update({ status: 'approved' }).eq('id', id);
    setActing(null);
    if (error) { toast.error(error.message); return; }
    setVehicles((vs) => vs.map((v) => v.id === id ? { ...v, status: 'approved' } : v));
    toast.success('Vehicle approved');
  };

  const rejectVehicle = async (id: string) => {
    setActing(id);
    const { error } = await supabase.from('vehicles').update({ status: 'rejected' }).eq('id', id);
    setActing(null);
    if (error) { toast.error(error.message); return; }
    setVehicles((vs) => vs.map((v) => v.id === id ? { ...v, status: 'rejected' } : v));
    toast.success('Vehicle rejected');
  };

  const approveDriver = async (id: string) => {
    setActing(id);
    const { error } = await supabase
      .from('profiles')
      .update({ kyc_status: 'verified', is_verified_driver: true })
      .eq('id', id);
    setActing(null);
    if (error) { toast.error(error.message); return; }
    setDrivers((ds) => ds.map((d) => d.id === id ? { ...d, kyc_status: 'verified', is_verified_driver: true } : d));
    toast.success('Driver verified');
  };

  if (loading) return <div className="min-h-screen"><Navbar /></div>;

  const pendingDrivers = drivers.filter((d) => d.kyc_status === 'pending');
  const pendingVehicles = vehicles.filter((v) => v.status === 'pending');
  const totalRevenue = trips.reduce((sum, t) => sum + (t.total_seats - t.available_seats) * t.price_per_seat, 0);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage the platform</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{drivers.length}</p>
                  <p className="text-xs text-muted-foreground">Total drivers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <ShieldCheck className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingDrivers.length}</p>
                  <p className="text-xs text-muted-foreground">Pending KYC</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <Car className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingVehicles.length}</p>
                  <p className="text-xs text-muted-foreground">Pending vehicles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                  <TrendingUp className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold">{formatNaira(totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground">Gross trip value</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="drivers">
          <TabsList>
            <TabsTrigger value="drivers">Drivers ({drivers.length})</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles ({vehicles.length})</TabsTrigger>
            <TabsTrigger value="trips">Trips ({trips.length})</TabsTrigger>
          </TabsList>

          {/* Drivers */}
          <TabsContent value="drivers" className="mt-4">
            {loadingData ? (
              <Skeleton className="h-64 w-full" />
            ) : drivers.length === 0 ? (
              <Card className="border-dashed"><CardContent className="py-12 text-center text-sm text-muted-foreground">No drivers registered yet.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {drivers.map((d) => (
                  <Card key={d.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {d.full_name?.[0] ?? 'D'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">{d.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Joined {new Date(d.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            d.kyc_status === 'verified' ? 'bg-success/10 text-success' :
                            d.kyc_status === 'pending' ? 'bg-accent/10 text-accent' :
                            d.kyc_status === 'rejected' ? 'bg-destructive/10 text-destructive' : ''
                          }
                        >
                          {KYC_STATUS_LABELS[d.kyc_status]}
                        </Badge>
                        {d.kyc_status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            disabled={acting === d.id}
                            onClick={() => approveDriver(d.id)}
                          >
                            {acting === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Approve
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Vehicles */}
          <TabsContent value="vehicles" className="mt-4">
            {loadingData ? (
              <Skeleton className="h-64 w-full" />
            ) : vehicles.length === 0 ? (
              <Card className="border-dashed"><CardContent className="py-12 text-center text-sm text-muted-foreground">No vehicles registered yet.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {vehicles.map((v) => (
                  <Card key={v.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                          <Car className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{v.make} {v.model} ({v.year})</p>
                          <p className="text-xs text-muted-foreground">
                            {v.plate_number} · Driver: {v.driver?.full_name ?? '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            v.status === 'approved' ? 'bg-success/10 text-success' :
                            v.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'
                          }
                        >
                          {v.status}
                        </Badge>
                        {v.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" className="gap-1.5" disabled={acting === v.id} onClick={() => approveVehicle(v.id)}>
                              {acting === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 text-destructive" disabled={acting === v.id} onClick={() => rejectVehicle(v.id)}>
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Trips */}
          <TabsContent value="trips" className="mt-4">
            {loadingData ? (
              <Skeleton className="h-64 w-full" />
            ) : trips.length === 0 ? (
              <Card className="border-dashed"><CardContent className="py-12 text-center text-sm text-muted-foreground">No trips published yet.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {trips.map((t) => (
                  <Card key={t.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm font-semibold">{t.origin} → {t.destination}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(t.departure_time)} · Driver: {t.driver?.full_name ?? '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-primary">{formatNaira(t.price_per_seat)}</span>
                        <Badge variant="outline" className="capitalize">{t.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
