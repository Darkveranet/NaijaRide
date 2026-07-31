'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { formatNaira, formatDateTime, TRIP_STATUS_LABELS, KYC_STATUS_LABELS } from '@/lib/constants';
import { Trip, Booking } from '@/lib/types';
import {
  Plus,
  Car,
  Calendar,
  Users,
  Wallet,
  Star,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Clock,
} from 'lucide-react';

export default function DriverDashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (!loading && profile && profile.role !== 'driver') {
      router.push('/dashboard');
      return;
    }
    if (!user) return;

    const load = async () => {
      const { data: tripsData } = await supabase
        .from('trips')
        .select('*')
        .eq('driver_id', user.id)
        .order('departure_time', { ascending: false });
      setTrips((tripsData || []) as Trip[]);

      const tripIds = (tripsData || []).map((t) => t.id);
      if (tripIds.length > 0) {
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('*, trip:trips!bookings_trip_id_fkey(*)')
          .in('trip_id', tripIds)
          .order('created_at', { ascending: false });
        setBookings((bookingsData || []) as Booking[]);
      }
      setLoadingData(false);
    };
    load();
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-12"><Skeleton className="h-64 w-full" /></div>
      </div>
    );
  }

  const upcomingTrips = trips.filter(
    (t) => t.status === 'scheduled' && new Date(t.departure_time) > new Date()
  );
  const pastTrips = trips.filter(
    (t) => t.status !== 'scheduled' || new Date(t.departure_time) <= new Date()
  );
  const totalEarnings = bookings
    .filter((b) => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + b.total_amount, 0);
  const totalSeats = trips.reduce((sum, t) => sum + t.total_seats - t.available_seats, 0);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold sm:text-3xl">Driver Dashboard</h1>
              {profile?.is_verified_driver && (
                <Badge className="gap-1 bg-success/10 text-success">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {profile?.full_name} · KYC: {profile ? KYC_STATUS_LABELS[profile.kyc_status] : '—'}
            </p>
          </div>
          <Button onClick={() => router.push('/driver/trips/new')} className="gap-2">
            <Plus className="h-4 w-4" /> Create Trip
          </Button>
        </div>

        {/* KYC banner */}
        {profile && !profile.is_verified_driver && (
          <Card className="mb-6 border-accent/40 bg-accent/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
                  <ShieldCheck className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold">Complete your verification</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.kyc_status === 'unverified'
                      ? 'Submit your NIN and documents to get the Verified Driver badge and start receiving bookings.'
                      : 'Your verification is under review. We will notify you once approved.'}
                  </p>
                </div>
              </div>
              {profile.kyc_status === 'unverified' && (
                <Button variant="outline" onClick={() => router.push('/driver/verification')}>
                  Verify now
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold">{formatNaira(totalEarnings)}</p>
                  <p className="text-xs text-muted-foreground">Total earnings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Calendar className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{upcomingTrips.length}</p>
                  <p className="text-xs text-muted-foreground">Upcoming trips</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <Users className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalSeats}</p>
                  <p className="text-xs text-muted-foreground">Seats booked</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                  <Star className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile?.rating?.toFixed(1) ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">Your rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcomingTrips.length})</TabsTrigger>
            <TabsTrigger value="past">History ({pastTrips.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            {loadingData ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
              </div>
            ) : upcomingTrips.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Car className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 font-medium">No upcoming trips</p>
                  <p className="mt-1 text-sm text-muted-foreground">Create a trip to start earning</p>
                  <Button className="mt-4 gap-2" onClick={() => router.push('/driver/trips/new')}>
                    <Plus className="h-4 w-4" /> Create Trip
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {upcomingTrips.map((t) => (
                  <Card key={t.id} className="transition-all hover:shadow-md">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <span>{t.origin}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{t.destination}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(t.departure_time)}</p>
                        </div>
                        <Badge variant="outline">{TRIP_STATUS_LABELS[t.status]}</Badge>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {t.available_seats}/{t.total_seats} available
                        </span>
                        <span className="font-bold text-primary">{formatNaira(t.price_per_seat)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-4">
            {pastTrips.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No trip history yet.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pastTrips.map((t) => (
                  <Card key={t.id} className="opacity-75">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <span>{t.origin}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{t.destination}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(t.departure_time)}</p>
                        </div>
                        <Badge variant="secondary">{TRIP_STATUS_LABELS[t.status]}</Badge>
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
