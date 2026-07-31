'use client';
import { useState } from 'react';
import { useMe, useDriverWallet, useMyTrips, useMyVehicles, createVehicle, createTrip, uploadFile, useInvalidate } from '@/lib/data';
import { SUPABASE_ENABLED, formatNaira } from '@/lib/supabase';
import { Button, Input, Skeleton, VerifiedBadge, ConfigNotice } from '@/components/ui';

export default function DriverDashboard() {
  const me = useMe();
  const wallet = useDriverWallet();
  const trips = useMyTrips();
  const vehicles = useMyVehicles();
  const invalidate = useInvalidate();
  const [tab, setTab] = useState<'overview' | 'vehicle' | 'trip'>('overview');

  if (!SUPABASE_ENABLED) return <ConfigNotice />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-extrabold">Driver dashboard</h1>
        {me.data?.isVerified ? <VerifiedBadge /> : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">Pending verification</span>}
      </div>

      <div className="flex gap-2 text-sm">
        {(['overview', 'vehicle', 'trip'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-3 py-1.5 font-semibold ${tab === t ? 'bg-brand-500 text-white' : 'border border-gray-300 dark:border-gray-700'}`}>
            {t === 'overview' ? 'Overview' : t === 'vehicle' ? 'Add vehicle' : 'Publish trip'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {wallet.isLoading ? <Skeleton className="h-20" /> : (
              <>
                <Stat label="Withdrawable" value={formatNaira(wallet.data?.withdrawableBalance ?? 0)} />
                <Stat label="Pending" value={formatNaira(wallet.data?.pendingBalance ?? 0)} />
                <Stat label="Lifetime earnings" value={formatNaira(wallet.data?.earnings ?? 0)} />
              </>
            )}
          </div>
          <section>
            <h2 className="mb-2 font-bold">My trips</h2>
            {trips.isLoading && <Skeleton className="h-20" />}
            {!trips.isLoading && (trips.data ?? []).length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center text-gray-500">No trips yet. Add a vehicle, then publish a trip.</div>}
            <div className="space-y-2">
              {(trips.data ?? []).map((t: any) => (
                <div key={t.id} className="flex justify-between rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-sm">
                  <span>{t.departureCity} → {t.destinationCity} · {new Date(t.departAt).toLocaleDateString('en-NG')}</span>
                  <span className="font-semibold">{t.availableSeats}/{t.totalSeats} seats · {t.status}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === 'vehicle' && <VehicleForm onDone={() => { invalidate(['my-vehicles']); setTab('trip'); }} />}
      {tab === 'trip' && <TripForm vehicles={vehicles.data ?? []} verified={!!me.data?.isVerified} onDone={() => { invalidate(['my-trips']); setTab('overview'); }} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4"><div className="text-xs text-gray-500">{label}</div><div className="mt-1 text-xl font-extrabold text-brand-600">{value}</div></div>;
}

function VehicleForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ make: '', model: '', year: '2020', colour: '', plateNumber: '', seats: '4', hasAc: true });
  const [photo, setPhoto] = useState<File | null>(null);
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg('');
    try {
      const photos: string[] = [];
      if (photo) photos.push(await uploadFile('vehicle-photos', photo));
      await createVehicle({ ...f, photos });
      setMsg('✅ Vehicle added.'); onDone();
    } catch (err: any) { setMsg(err?.message ?? 'Failed to add vehicle'); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="max-w-lg space-y-3 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
      <h2 className="font-bold">Add a vehicle</h2>
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Make (Toyota)" value={f.make} onChange={set('make')} required />
        <Input placeholder="Model (Sienna)" value={f.model} onChange={set('model')} required />
        <Input type="number" placeholder="Year" value={f.year} onChange={set('year')} />
        <Input placeholder="Colour" value={f.colour} onChange={set('colour')} required />
        <Input placeholder="Plate number" value={f.plateNumber} onChange={set('plateNumber')} required />
        <Input type="number" placeholder="Seats" value={f.seats} onChange={set('seats')} />
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.hasAc} onChange={(e) => setF({ ...f, hasAc: e.target.checked })} /> Has AC</label>
      <label className="block text-sm">Photo (uploaded to Supabase Storage)
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
      </label>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}
      <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save vehicle'}</Button>
    </form>
  );
}

function TripForm({ vehicles, verified, onDone }: { vehicles: any[]; verified: boolean; onDone: () => void }) {
  const [f, setF] = useState({ vehicleId: '', departureState: '', departureCity: '', destinationState: '', destinationCity: '', pickupPoint: '', dropoffPoint: '', departureDate: '', departureTime: '07:30', availableSeats: '4', priceNaira: '5000', luggageAllowance: '1 bag per seat', description: '' });
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg('');
    try {
      await createTrip({ ...f, availableSeats: Number(f.availableSeats), pricePerSeat: Math.round(Number(f.priceNaira) * 100) });
      setMsg('✅ Trip published.'); onDone();
    } catch (err: any) { setMsg(err?.message ?? 'Failed to publish trip'); }
    finally { setBusy(false); }
  };

  if (!verified) return <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-6 text-sm text-amber-800 dark:text-amber-200">Your account must be verified before publishing trips. An admin can verify you from the Admin dashboard, or set <code>is_verified = true</code> on your profile.</div>;
  if (vehicles.length === 0) return <div className="rounded-2xl border border-dashed p-6 text-sm text-gray-500">Add a vehicle first.</div>;

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-3 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
      <h2 className="font-bold">Publish a trip</h2>
      <label className="block text-sm">Vehicle
        <select className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2" value={f.vehicleId} onChange={set('vehicleId')} required>
          <option value="">Select…</option>
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} · {v.plate_number}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Departure state" value={f.departureState} onChange={set('departureState')} required />
        <Input placeholder="Departure city" value={f.departureCity} onChange={set('departureCity')} required />
        <Input placeholder="Destination state" value={f.destinationState} onChange={set('destinationState')} required />
        <Input placeholder="Destination city" value={f.destinationCity} onChange={set('destinationCity')} required />
        <Input placeholder="Pickup point" value={f.pickupPoint} onChange={set('pickupPoint')} required />
        <Input placeholder="Drop-off point" value={f.dropoffPoint} onChange={set('dropoffPoint')} required />
        <Input type="date" value={f.departureDate} onChange={set('departureDate')} required />
        <Input type="time" value={f.departureTime} onChange={set('departureTime')} required />
        <Input type="number" placeholder="Seats" value={f.availableSeats} onChange={set('availableSeats')} />
        <Input type="number" placeholder="Price per seat (₦)" value={f.priceNaira} onChange={set('priceNaira')} />
      </div>
      <Input placeholder="Luggage allowance" value={f.luggageAllowance} onChange={set('luggageAllowance')} />
      <Input placeholder="Description" value={f.description} onChange={set('description')} />
      {msg && <p className="text-sm text-brand-600">{msg}</p>}
      <Button type="submit" disabled={busy}>{busy ? 'Publishing…' : 'Publish trip'}</Button>
    </form>
  );
}
