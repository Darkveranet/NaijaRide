'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { formatDateTime } from '@/lib/constants';
import { RateDialog } from '@/components/shared/rate-dialog';
import { Star, CheckCircle2 } from 'lucide-react';

type Row = {
  id: string; trip_id: string; status: string; booking_reference: string;
  trip?: { origin: string; destination: string; departure_time: string; driver_id: string; driver?: { full_name: string } | null } | null;
};

function Inner() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [ratedTrips, setRatedTrips] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('bookings')
      .select('id, trip_id, status, booking_reference, trip:trips!bookings_trip_id_fkey(origin,destination,departure_time,driver_id, driver:profiles!trips_driver_id_fkey(full_name))')
      .eq('passenger_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
    const bs = (data || []) as unknown as Row[];
    setRows(bs);
    // which trips has this user already reviewed?
    const { data: revs } = await supabase.from('reviews').select('trip_id').eq('reviewer_id', user.id);
    setRatedTrips(new Set((revs || []).map((r: any) => r.trip_id)));
    setLoadingData(false);
  };

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  if (loading || loadingData) {
    return <div className="min-h-screen"><Navbar /><div className="container py-8 space-y-4"><Skeleton className="h-9 w-56" /><Skeleton className="h-40" /></div></div>;
  }

  return (
    <div className="min-h-screen"><Navbar />
      <div className="container max-w-2xl py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Rate your trips</h1>
          <p className="text-sm text-muted-foreground">Help the community by rating drivers on completed trips.</p>
        </div>
        {rows.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-12 text-center text-sm text-muted-foreground">No completed trips to rate yet.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const rated = ratedTrips.has(r.trip_id);
              return (
                <Card key={r.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary/10 text-primary text-xs">{r.trip?.driver?.full_name?.[0] ?? 'D'}</AvatarFallback></Avatar>
                      <div>
                        <p className="text-sm font-semibold">{r.trip?.origin} → {r.trip?.destination}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(r.trip?.departure_time || '')} · {r.trip?.driver?.full_name}</p>
                      </div>
                    </div>
                    {rated ? (
                      <Badge className="bg-success/10 text-success gap-1"><CheckCircle2 className="h-3 w-3" /> Rated</Badge>
                    ) : (
                      <RateDialog
                        tripId={r.trip_id}
                        revieweeId={r.trip!.driver_id}
                        revieweeName={r.trip?.driver?.full_name}
                        onDone={load}
                        trigger={<Button size="sm" className="gap-1.5"><Star className="h-3.5 w-3.5" /> Rate</Button>}
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default function RatePage() {
  return <Suspense fallback={<div className="min-h-screen"><Navbar /></div>}><Inner /></Suspense>;
}
