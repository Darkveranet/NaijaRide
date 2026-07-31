'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { formatNaira, formatDateTime, BOOKING_STATUS_LABELS } from '@/lib/constants';
import { BookingWithTrip } from '@/lib/types';
import { Calendar, MapPin, ArrowRight, Search, Ticket, Clock } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [bookings, setBookings] = useState<BookingWithTrip[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (!loading && profile?.role === 'driver') {
      router.push('/driver');
      return;
    }
    if (!user) return;

    const load = async () => {
      const { data } = await supabase
        .from('bookings')
        .select(`
          *,
          trip:trips(
            *,
            driver:profiles!trips_driver_id_fkey(*),
            vehicle:vehicles!trips_vehicle_id_fkey(*)
          )
        `)
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false });
      setBookings((data || []) as BookingWithTrip[]);
      setLoadingBookings(false);
    };
    load();
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-12"><Skeleton className="h-64 w-full" /></div>
      </div>
    );
  }

  if (profile?.role === 'driver') {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-12 text-center text-muted-foreground">Redirecting to driver dashboard...</div>
      </div>
    );
  }

  const upcoming = bookings.filter(
    (b) => b.status === 'confirmed' && b.trip && new Date(b.trip.departure_time) > new Date()
  );
  const past = bookings.filter(
    (b) => b.status !== 'confirmed' || (b.trip && new Date(b.trip.departure_time) <= new Date())
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              Hello, {profile?.full_name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-sm text-muted-foreground">Manage your bookings and trips</p>
          </div>
          <Button onClick={() => router.push('/search')} className="gap-2">
            <Search className="h-4 w-4" /> Find a trip
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Ticket className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{bookings.length}</p>
                  <p className="text-xs text-muted-foreground">Total bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{upcoming.length}</p>
                  <p className="text-xs text-muted-foreground">Upcoming trips</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <MapPin className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{past.length}</p>
                  <p className="text-xs text-muted-foreground">Past trips</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming */}
        <div className="mb-8">
          <h2 className="mb-4 font-display text-xl font-semibold">Upcoming Trips</h2>
          {loadingBookings ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : upcoming.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground" />
                <p className="mt-3 font-medium">No upcoming trips</p>
                <p className="mt-1 text-sm text-muted-foreground">Search for your next adventure</p>
                <Button className="mt-4 gap-2" onClick={() => router.push('/search')}>
                  <Search className="h-4 w-4" /> Find a trip
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {upcoming.map((b) => (
                <Card key={b.id} className="transition-all hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={b.trip?.driver?.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {b.trip?.driver?.full_name?.[0] ?? 'D'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">{b.trip?.driver?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(b.trip?.departure_time || '')}</p>
                        </div>
                      </div>
                      <Badge className="bg-success/10 text-success">{BOOKING_STATUS_LABELS[b.status]}</Badge>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm">
                      <span className="font-medium">{b.trip?.origin}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{b.trip?.destination}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {b.seats_booked} seat{b.seats_booked === 1 ? '' : 's'} · Ref: {b.booking_reference}
                      </span>
                      <span className="font-bold text-primary">{formatNaira(b.total_amount)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Past */}
        {past.length > 0 && (
          <div>
            <h2 className="mb-4 font-display text-xl font-semibold">Trip History</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {past.map((b) => (
                <Card key={b.id} className="opacity-75">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{b.trip?.origin} → {b.trip?.destination}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(b.trip?.departure_time || '')}</p>
                      </div>
                      <Badge variant="secondary">{BOOKING_STATUS_LABELS[b.status]}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Ref: {b.booking_reference}</span>
                      <span className="font-semibold">{formatNaira(b.total_amount)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
