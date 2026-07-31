'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { NIGERIAN_CITIES } from '@/lib/constants';
import { Vehicle } from '@/lib/types';
import { ArrowRight, Loader2, Car, Plus } from 'lucide-react';

export default function CreateTripPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [pricePerSeat, setPricePerSeat] = useState('');
  const [totalSeats, setTotalSeats] = useState('');
  const [luggage, setLuggage] = useState('1 medium bag');
  const [description, setDescription] = useState('');

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

    const loadVehicles = async () => {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('driver_id', user.id)
        .eq('status', 'approved');
      setVehicles((data || []) as Vehicle[]);
    };
    loadVehicles();
  }, [user, profile, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!origin || !destination || !departureDate || !departureTime || !vehicleId || !pricePerSeat || !totalSeats) {
      toast.error('Please fill in all required fields');
      return;
    }

    const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
    if (selectedVehicle && parseInt(totalSeats) > selectedVehicle.total_seats) {
      toast.error(`This vehicle only has ${selectedVehicle.total_seats} seats`);
      return;
    }

    if (!profile?.is_verified_driver) {
      toast.error('Only verified drivers can publish trips. Complete your KYC first.');
      router.push('/driver/verification');
      return;
    }

    setSubmitting(true);
    const departureTimeISO = new Date(`${departureDate}T${departureTime}`).toISOString();

    const { error } = await supabase.from('trips').insert({
      driver_id: user.id,
      vehicle_id: vehicleId,
      origin,
      destination,
      departure_time: departureTimeISO,
      price_per_seat: parseInt(pricePerSeat),
      total_seats: parseInt(totalSeats),
      available_seats: parseInt(totalSeats),
      luggage_allowance: luggage,
      description: description || null,
      status: 'scheduled',
    });

    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Trip published! Passengers can now book it.');
    router.push('/driver');
  };

  if (loading) return <div className="min-h-screen"><Navbar /></div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-2xl py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Create a Trip</h1>
          <p className="text-sm text-muted-foreground">Publish a new intercity trip for passengers to book</p>
        </div>

        {vehicles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Car className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-display text-lg font-semibold">No approved vehicles yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                You need at least one approved vehicle before you can create a trip.
                Add your vehicle and wait for admin approval.
              </p>
              <Button className="mt-4 gap-2" onClick={() => router.push('/driver/vehicles')}>
                <Plus className="h-4 w-4" /> Add a vehicle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/60 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Trip Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>From *</Label>
                    <Select value={origin} onValueChange={setOrigin}>
                      <SelectTrigger><SelectValue placeholder="Departure city" /></SelectTrigger>
                      <SelectContent>
                        {NIGERIAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>To *</Label>
                    <Select value={destination} onValueChange={setDestination}>
                      <SelectTrigger><SelectValue placeholder="Destination city" /></SelectTrigger>
                      <SelectContent>
                        {NIGERIAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="date">Departure date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Departure time *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Vehicle *</Label>
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger><SelectValue placeholder="Select a vehicle" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.make} {v.model} ({v.year}) · {v.plate_number} · {v.total_seats} seats
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price per seat (₦) *</Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="e.g. 15000"
                      value={pricePerSeat}
                      onChange={(e) => setPricePerSeat(e.target.value)}
                      min="1000"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seats">Total seats *</Label>
                    <Input
                      id="seats"
                      type="number"
                      placeholder="e.g. 4"
                      value={totalSeats}
                      onChange={(e) => setTotalSeats(e.target.value)}
                      min="1"
                      max="8"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="luggage">Luggage allowance</Label>
                  <Input
                    id="luggage"
                    value={luggage}
                    onChange={(e) => setLuggage(e.target.value)}
                    placeholder="e.g. 1 medium bag per passenger"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc">Description (optional)</Label>
                  <Textarea
                    id="desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add trip notes, pickup details, or special instructions"
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Publishing...</>
                  ) : (
                    <>Publish trip <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
}
