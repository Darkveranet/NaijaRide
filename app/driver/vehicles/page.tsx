'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { Vehicle } from '@/lib/types';
import { Plus, Car, Trash2, Snowflake, Loader2 } from 'lucide-react';

const VEHICLE_MAKES = ['Toyota', 'Honda', 'Lexus', 'Mercedes', 'BMW', 'Hyundai', 'Kia', 'Mazda', 'Nissan', 'Volkswagen'];

export default function VehiclesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plate, setPlate] = useState('');
  const [seats, setSeats] = useState('4');
  const [hasAc, setHasAc] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false });
      setVehicles((data || []) as Vehicle[]);
      setLoadingVehicles(false);
    };
    load();
  }, [user, loading, router]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!make || !model || !year || !color || !plate || !seats) {
      toast.error('Please fill in all fields');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('vehicles').insert({
      driver_id: user.id,
      make,
      model,
      year: parseInt(year),
      color,
      plate_number: plate.toUpperCase(),
      total_seats: parseInt(seats),
      has_ac: hasAc,
      status: 'pending',
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Vehicle added! Awaiting admin approval.');
    setDialogOpen(false);
    setMake(''); setModel(''); setYear(''); setColor(''); setPlate(''); setSeats('4'); setHasAc(true);
    // reload
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('driver_id', user.id)
      .order('created_at', { ascending: false });
    setVehicles((data || []) as Vehicle[]);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setVehicles((v) => v.filter((veh) => veh.id !== id));
    toast.success('Vehicle removed');
  };

  if (loading) return <div className="min-h-screen"><Navbar /></div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-3xl py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">My Vehicles</h1>
            <p className="text-sm text-muted-foreground">Manage your registered vehicles</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Vehicle</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add a Vehicle</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Make *</Label>
                    <Input list="makes" value={make} onChange={(e) => setMake(e.target.value)} placeholder="Toyota" required />
                    <datalist id="makes">
                      {VEHICLE_MAKES.map((m) => <option key={m} value={m} />)}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label>Model *</Label>
                    <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Camry" required />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Year *</Label>
                    <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2020" min="1990" max="2026" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Colour *</Label>
                    <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Silver" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Seats *</Label>
                    <Input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} min="1" max="8" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Plate Number *</Label>
                  <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="ABC123XY" required />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Snowflake className="h-4 w-4 text-primary" />
                    <Label htmlFor="ac" className="cursor-pointer">Air Conditioning</Label>
                  </div>
                  <Switch id="ac" checked={hasAc} onCheckedChange={setHasAc} />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding...</> : 'Add vehicle'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loadingVehicles ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
          </div>
        ) : vehicles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Car className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 font-display text-lg font-semibold">No vehicles yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add your vehicle to start creating trips. Each vehicle is reviewed
                by our team before approval.
              </p>
              <Button className="mt-4 gap-2" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" /> Add your first vehicle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {vehicles.map((v) => (
              <Card key={v.id} className="transition-all hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                        <Car className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">{v.make} {v.model}</p>
                        <p className="text-xs text-muted-foreground">{v.year} · {v.color}</p>
                      </div>
                    </div>
                    <Badge
                      className={
                        v.status === 'approved'
                          ? 'bg-success/10 text-success'
                          : v.status === 'rejected'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-accent/10 text-accent'
                      }
                    >
                      {v.status === 'approved' ? 'Approved' : v.status === 'rejected' ? 'Rejected' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span>Plate: <span className="font-medium text-foreground">{v.plate_number}</span></span>
                    <span>{v.total_seats} seats</span>
                    {v.has_ac && <Badge variant="secondary" className="gap-1"><Snowflake className="h-3 w-3" /> AC</Badge>}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(v.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
