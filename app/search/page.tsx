'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { TripCard } from '@/components/shared/trip-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase/client';
import { NIGERIAN_CITIES } from '@/lib/constants';
import { TripWithDriver } from '@/lib/types';
import { Search, SlidersHorizontal, MapPin, Calendar, X, Car } from 'lucide-react';

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen"><Navbar /></div>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [origin, setOrigin] = useState(searchParams.get('origin') || '');
  const [destination, setDestination] = useState(searchParams.get('destination') || '');
  const [date, setDate] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('earliest');
  const [trips, setTrips] = useState<TripWithDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('trips')
      .select(`
        *,
        driver:profiles!trips_driver_id_fkey(*),
        vehicle:vehicles!trips_vehicle_id_fkey(*)
      `)
      .eq('status', 'scheduled')
      .gt('available_seats', 0)
      .gte('departure_time', new Date().toISOString());

    if (origin) query = query.eq('origin', origin);
    if (destination) query = query.eq('destination', destination);
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query = query.gte('departure_time', start.toISOString()).lte('departure_time', end.toISOString());
    }
    if (maxPrice) query = query.lte('price_per_seat', parseInt(maxPrice));

    const sortMap: Record<string, { column: string; ascending: boolean }> = {
      earliest: { column: 'departure_time', ascending: true },
      latest: { column: 'departure_time', ascending: false },
      price_low: { column: 'price_per_seat', ascending: true },
      price_high: { column: 'price_per_seat', ascending: false },
    };
    const sort = sortMap[sortBy] || sortMap.earliest;
    query = query.order(sort.column, { ascending: sort.ascending });

    const { data, error } = await query;
    setLoading(false);
    if (error) {
      console.error(error);
      return;
    }
    setTrips((data || []) as TripWithDriver[]);
  }, [origin, destination, date, maxPrice, sortBy]);

  useEffect(() => {
    fetchTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, date, maxPrice, sortBy]);

  const updateUrl = () => {
    const params = new URLSearchParams();
    if (origin) params.set('origin', origin);
    if (destination) params.set('destination', destination);
    router.replace(`/search?${params.toString()}`);
  };

  const clearFilters = () => {
    setOrigin('');
    setDestination('');
    setDate('');
    setMaxPrice('');
    router.replace('/search');
  };

  const hasFilters = origin || destination || date || maxPrice;

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Search bar */}
      <section className="border-b border-border/60 bg-secondary/30 py-6">
        <div className="container">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                <div className="text-left">
                  <Label className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> From
                  </Label>
                  <Select value={origin} onValueChange={(v) => { setOrigin(v); updateUrl(); }}>
                    <SelectTrigger><SelectValue placeholder="Any city" /></SelectTrigger>
                    <SelectContent>
                      {NIGERIAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-left">
                  <Label className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> To
                  </Label>
                  <Select value={destination} onValueChange={(v) => { setDestination(v); updateUrl(); }}>
                    <SelectTrigger><SelectValue placeholder="Any city" /></SelectTrigger>
                    <SelectContent>
                      {NIGERIAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-left">
                  <Label className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" /> Date
                  </Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="w-full gap-2 md:w-auto"
                    onClick={() => setFiltersOpen((o) => !o)}
                  >
                    <SlidersHorizontal className="h-4 w-4" /> Filters
                  </Button>
                </div>
              </div>

              {filtersOpen && (
                <div className="mt-4 grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2">
                  <div className="text-left">
                    <Label className="mb-1 text-xs text-muted-foreground">Max price per seat (₦)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 15000"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </div>
                  <div className="text-left">
                    <Label className="mb-1 text-xs text-muted-foreground">Sort by</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="earliest">Earliest departure</SelectItem>
                        <SelectItem value="latest">Latest departure</SelectItem>
                        <SelectItem value="price_low">Price: low to high</SelectItem>
                        <SelectItem value="price_high">Price: high to low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Results */}
      <section className="py-8">
        <div className="container">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold">
                {origin || destination
                  ? `${origin || 'Anywhere'} → ${destination || 'Anywhere'}`
                  : 'Available Trips'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Searching...' : `${trips.length} trip${trips.length === 1 ? '' : 's'} found`}
              </p>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5">
                <X className="h-4 w-4" /> Clear filters
              </Button>
            )}
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="mt-4 h-4 w-2/3" />
                    <Skeleton className="mt-3 h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : trips.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                  <Car className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">No trips found</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Try adjusting your filters or search a different route. New trips
                  are published every day.
                </p>
                {hasFilters && (
                  <Button variant="outline" className="mt-4 gap-1.5" onClick={clearFilters}>
                    <X className="h-4 w-4" /> Clear all filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
