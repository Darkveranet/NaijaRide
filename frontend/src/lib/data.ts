/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, SUPABASE_ENABLED } from './supabase';

// ── Guard ────────────────────────────────────────────────────
function db() {
  if (!supabase) throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  return supabase;
}

// ── Mappers (snake_case DB -> camelCase UI) ──────────────────
function mapTrip(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    departureState: r.departure_state, departureCity: r.departure_city,
    destinationState: r.destination_state, destinationCity: r.destination_city,
    pickupPoint: r.pickup_point, dropoffPoint: r.dropoff_point,
    departAt: r.depart_at, departureTime: r.departure_time,
    totalSeats: r.total_seats, availableSeats: r.available_seats,
    pricePerSeat: r.price_per_seat, luggageAllowance: r.luggage_allowance,
    description: r.description, status: r.status,
    vehicle: r.vehicle ? { make: r.vehicle.make, model: r.vehicle.model, colour: r.vehicle.colour, hasAc: r.vehicle.has_ac, seats: r.vehicle.seats } : null,
    driver: r.driver ? {
      isVerified: r.driver.is_verified, ratingAverage: r.driver.rating_average, ratingCount: r.driver.rating_count,
      phone: r.driver.phone, // used for the "Contact driver" WhatsApp link
      user: { firstName: r.driver.first_name, lastName: r.driver.last_name, avatarUrl: r.driver.avatar_url, phone: r.driver.phone },
    } : null,
  };
}

function mapBooking(r: any) {
  return {
    id: r.id, reference: r.reference, seatCount: r.seat_count, amount: r.amount, status: r.status,
    trip: r.trip ? {
      departureCity: r.trip.departure_city, destinationCity: r.trip.destination_city,
      departAt: r.trip.depart_at,
      driver: r.trip.driver ? { firstName: r.trip.driver.first_name, phone: r.trip.driver.phone } : null,
      vehicle: r.trip.vehicle ? { make: r.trip.vehicle.make, model: r.trip.vehicle.model, hasAc: r.trip.vehicle.has_ac } : null,
    } : null,
  };
}

const TRIP_SELECT =
  '*, driver:driver_id!inner(first_name,last_name,phone,avatar_url,is_verified,rating_average,rating_count), vehicle:vehicle_id!inner(make,model,colour,has_ac,seats)';

// ── Auth ─────────────────────────────────────────────────────
export async function signUp(input: { email: string; password: string; firstName: string; lastName: string; phone: string; role: 'PASSENGER' | 'DRIVER' }) {
  const { data, error } = await db().auth.signUp({
    email: input.email, password: input.password,
    options: { data: { first_name: input.firstName, last_name: input.lastName, phone: input.phone, role: input.role } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await db().auth.signInWithPassword({ email, password });
  if (error) throw error;
  const profile = await getMyProfile();
  return { session: data.session, role: profile?.role ?? 'PASSENGER' };
}

export async function signOut() { await db().auth.signOut(); }

export async function getMyProfile() {
  const { data: { user } } = await db().auth.getUser();
  if (!user) return null;
  const { data } = await db().from('profiles').select('*').eq('id', user.id).single();
  return data
    ? { id: data.id, role: data.role, firstName: data.first_name, lastName: data.last_name, phone: data.phone,
        isVerified: data.is_verified, kycStatus: data.kyc_status, ratingAverage: data.rating_average,
        driverProfile: { isVerified: data.is_verified }, kyc: { status: data.kyc_status } }
    : null;
}

// ── Trips ────────────────────────────────────────────────────
export async function searchTrips(params: { origin?: string; destination?: string; date?: string; maxPrice?: number; hasAc?: boolean; sort?: string }) {
  let q = db().from('trips').select(TRIP_SELECT)
    .eq('status', 'SCHEDULED').gt('available_seats', 0)
    .gte('depart_at', new Date().toISOString())
    .eq('driver.is_verified', true);

  if (params.origin) q = q.ilike('departure_city', params.origin);
  if (params.destination) q = q.ilike('destination_city', params.destination);
  if (params.date) {
    q = q.gte('depart_at', `${params.date}T00:00:00`).lte('depart_at', `${params.date}T23:59:59`);
  }
  if (params.maxPrice) q = q.lte('price_per_seat', params.maxPrice);
  if (params.hasAc) q = q.eq('vehicle.has_ac', true);
  q = params.sort === 'price' ? q.order('price_per_seat', { ascending: true }) : q.order('depart_at', { ascending: true });

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapTrip);
}

export async function getTrip(id: string) {
  const { data, error } = await db().from('trips').select(TRIP_SELECT).eq('id', id).single();
  if (error) throw error;
  return mapTrip(data);
}

export async function myTrips() {
  const { data: { user } } = await db().auth.getUser();
  if (!user) return [];
  const { data, error } = await db().from('trips').select(TRIP_SELECT).eq('driver_id', user.id).order('depart_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapTrip);
}

export async function createTrip(input: any) {
  const { data: { user } } = await db().auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const departAt = new Date(`${input.departureDate}T${input.departureTime}:00`).toISOString();
  const { data, error } = await db().from('trips').insert({
    driver_id: user.id, vehicle_id: input.vehicleId,
    departure_state: input.departureState, departure_city: input.departureCity,
    destination_state: input.destinationState, destination_city: input.destinationCity,
    pickup_point: input.pickupPoint, dropoff_point: input.dropoffPoint,
    depart_at: departAt, departure_time: input.departureTime,
    total_seats: input.availableSeats, available_seats: input.availableSeats,
    price_per_seat: input.pricePerSeat, luggage_allowance: input.luggageAllowance, description: input.description,
  }).select().single();
  if (error) throw error;
  return data;
}

// ── Vehicles ─────────────────────────────────────────────────
export async function myVehicles() {
  const { data: { user } } = await db().auth.getUser();
  if (!user) return [];
  const { data, error } = await db().from('vehicles').select('*').eq('driver_id', user.id).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createVehicle(input: any) {
  const { data: { user } } = await db().auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await db().from('vehicles').insert({
    driver_id: user.id, make: input.make, model: input.model, year: Number(input.year),
    colour: input.colour, plate_number: String(input.plateNumber).toUpperCase(),
    seats: Number(input.seats), has_ac: !!input.hasAc, photos: input.photos ?? [], status: 'APPROVED',
  }).select().single();
  if (error) throw error;
  return data;
}

// ── Bookings & payment ───────────────────────────────────────
export async function createBooking(tripId: string, seatCount: number) {
  const { data, error } = await db().rpc('create_booking', { p_trip_id: tripId, p_seat_count: seatCount });
  if (error) throw error;
  return data;
}

export async function confirmBooking(bookingId: string) {
  const { data, error } = await db().rpc('confirm_booking', { p_booking_id: bookingId });
  if (error) throw error;
  return data;
}

export async function myBookings() {
  const { data: { user } } = await db().auth.getUser();
  if (!user) return [];
  const { data, error } = await db().from('bookings')
    .select('*, trip:trip_id(departure_city,destination_city,depart_at, driver:driver_id(first_name,phone), vehicle:vehicle_id(make,model,has_ac))')
    .eq('passenger_id', user.id).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapBooking);
}

// ── Wallet & admin ───────────────────────────────────────────
export async function driverWallet() {
  const { data, error } = await db().rpc('driver_wallet');
  if (error) throw error;
  return data;
}

export async function adminAnalytics() {
  const { data, error } = await db().rpc('admin_analytics');
  if (error) throw error;
  return data;
}

export async function pendingDrivers() {
  const { data, error } = await db().from('profiles').select('id,first_name,last_name,phone,kyc_status')
    .eq('role', 'DRIVER').eq('is_verified', false).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p: any) => ({ id: p.id, user: { id: p.id, firstName: p.first_name, lastName: p.last_name, phone: p.phone } }));
}

export async function setDriverVerified(target: string, approve: boolean) {
  const { error } = await db().rpc('admin_set_verified', { p_target: target, p_approve: approve });
  if (error) throw error;
}

// ── Storage ──────────────────────────────────────────────────
export async function uploadFile(bucket: 'vehicle-photos' | 'kyc-documents', file: File, prefix = '') {
  const { data: { user } } = await db().auth.getUser();
  const path = `${bucket === 'kyc-documents' ? `${user?.id}/` : ''}${prefix}${Date.now()}-${file.name}`;
  const { error } = await db().storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  if (bucket === 'vehicle-photos') return db().storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const { data } = await db().storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl ?? path;
}

// ── React Query hooks ────────────────────────────────────────
export function useTripSearch(params: any) {
  return useQuery({ queryKey: ['trips', params], queryFn: () => searchTrips(params), enabled: SUPABASE_ENABLED });
}
export function useTrip(id: string) {
  return useQuery({ queryKey: ['trip', id], queryFn: () => getTrip(id), enabled: SUPABASE_ENABLED && !!id });
}
export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: getMyProfile, enabled: SUPABASE_ENABLED });
}
export function useMyBookings() {
  return useQuery({ queryKey: ['my-bookings'], queryFn: myBookings, enabled: SUPABASE_ENABLED });
}
export function useMyTrips() {
  return useQuery({ queryKey: ['my-trips'], queryFn: myTrips, enabled: SUPABASE_ENABLED });
}
export function useMyVehicles() {
  return useQuery({ queryKey: ['my-vehicles'], queryFn: myVehicles, enabled: SUPABASE_ENABLED });
}
export function useDriverWallet() {
  return useQuery({ queryKey: ['wallet'], queryFn: driverWallet, enabled: SUPABASE_ENABLED });
}
export function useAdminAnalytics() {
  return useQuery({ queryKey: ['admin-analytics'], queryFn: adminAnalytics, enabled: SUPABASE_ENABLED });
}
export function usePendingDrivers() {
  return useQuery({ queryKey: ['pending-drivers'], queryFn: pendingDrivers, enabled: SUPABASE_ENABLED });
}
export function useInvalidate() {
  const qc = useQueryClient();
  return (keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}
