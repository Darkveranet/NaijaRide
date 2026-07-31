/*
# NaijaRide core schema

Builds the data model for an intercity car-trip booking platform in Nigeria.

1. New Tables
- `profiles` — extends auth.users with role (passenger/driver/admin), full name, phone, avatar, KYC status, verification badge.
- `vehicles` — a driver's cars (make/model/year/colour/plate/seats/AC/photos/status).
- `trips` — scheduled intercity trips a driver publishes (origin, destination, departure time, price per seat, seats, status).
- `bookings` — a passenger's reservation on a trip (seats booked, amount, status, reference).
- `reviews` — ratings left by passengers on drivers (and vice versa) after a trip.
- `saved_routes` — passenger's favourite origin/destination pairs.

2. Security
- RLS enabled on every table.
- Profiles: each authenticated user reads/updates their own row.
- Vehicles, trips: driver owns their rows (driver_id = auth.uid()).
- Bookings: passenger owns their booking; the trip's driver may also read it (via trip join).
- Reviews: reviewer owns their row; reviewee may read.
- Saved routes: passenger owns their rows.
- Public read on trips + reviews so unauthenticated visitors can search (TO anon, authenticated SELECT).
*/

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger','driver','admin')),
  full_name text NOT NULL DEFAULT '',
  phone text,
  avatar_url text,
  kyc_status text NOT NULL DEFAULT 'unverified' CHECK (kyc_status IN ('unverified','pending','verified','rejected')),
  is_verified_driver boolean NOT NULL DEFAULT false,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  color text NOT NULL,
  plate_number text NOT NULL,
  total_seats integer NOT NULL DEFAULT 4 CHECK (total_seats > 0),
  has_ac boolean NOT NULL DEFAULT true,
  photo_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_vehicles" ON public.vehicles;
CREATE POLICY "select_own_vehicles" ON public.vehicles FOR SELECT
  TO authenticated USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "insert_own_vehicles" ON public.vehicles;
CREATE POLICY "insert_own_vehicles" ON public.vehicles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "update_own_vehicles" ON public.vehicles;
CREATE POLICY "update_own_vehicles" ON public.vehicles FOR UPDATE
  TO authenticated USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "delete_own_vehicles" ON public.vehicles;
CREATE POLICY "delete_own_vehicles" ON public.vehicles FOR DELETE
  TO authenticated USING (auth.uid() = driver_id);

-- trips
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  origin text NOT NULL,
  destination text NOT NULL,
  departure_time timestamptz NOT NULL,
  price_per_seat integer NOT NULL CHECK (price_per_seat > 0),
  total_seats integer NOT NULL CHECK (total_seats > 0),
  available_seats integer NOT NULL CHECK (available_seats >= 0),
  luggage_allowance text NOT NULL DEFAULT '1 medium bag',
  description text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_trips_search ON public.trips (origin, destination, departure_time);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON public.trips (driver_id);

-- public read so visitors can search
DROP POLICY IF EXISTS "public_select_trips" ON public.trips;
CREATE POLICY "public_select_trips" ON public.trips FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_trips" ON public.trips;
CREATE POLICY "insert_own_trips" ON public.trips FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "update_own_trips" ON public.trips;
CREATE POLICY "update_own_trips" ON public.trips FOR UPDATE
  TO authenticated USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "delete_own_trips" ON public.trips;
CREATE POLICY "delete_own_trips" ON public.trips FOR DELETE
  TO authenticated USING (auth.uid() = driver_id);

-- bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  passenger_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  seats_booked integer NOT NULL CHECK (seats_booked > 0),
  total_amount integer NOT NULL CHECK (total_amount >= 0),
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed')),
  booking_reference text NOT NULL DEFAULT upper(substr(encode(gen_random_bytes(5),'hex'),1,8)),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_bookings_passenger ON public.bookings (passenger_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trip ON public.bookings (trip_id);

DROP POLICY IF EXISTS "select_own_bookings" ON public.bookings;
CREATE POLICY "select_own_bookings" ON public.bookings FOR SELECT
  TO authenticated USING (
    auth.uid() = passenger_id
    OR EXISTS (SELECT 1 FROM public.trips t WHERE t.id = bookings.trip_id AND t.driver_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_bookings" ON public.bookings;
CREATE POLICY "insert_own_bookings" ON public.bookings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = passenger_id);

DROP POLICY IF EXISTS "update_own_bookings" ON public.bookings;
CREATE POLICY "update_own_bookings" ON public.bookings FOR UPDATE
  TO authenticated USING (auth.uid() = passenger_id)
  WITH CHECK (auth.uid() = passenger_id);

-- reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON public.reviews (reviewee_id);

DROP POLICY IF EXISTS "public_select_reviews" ON public.reviews;
CREATE POLICY "public_select_reviews" ON public.reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_reviews" ON public.reviews;
CREATE POLICY "insert_own_reviews" ON public.reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reviewer_id);

-- saved routes
CREATE TABLE IF NOT EXISTS public.saved_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  origin text NOT NULL,
  destination text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_saved_routes" ON public.saved_routes;
CREATE POLICY "select_own_saved_routes" ON public.saved_routes FOR SELECT
  TO authenticated USING (auth.uid() = passenger_id);

DROP POLICY IF EXISTS "insert_own_saved_routes" ON public.saved_routes;
CREATE POLICY "insert_own_saved_routes" ON public.saved_routes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = passenger_id);

DROP POLICY IF EXISTS "delete_own_saved_routes" ON public.saved_routes;
CREATE POLICY "delete_own_saved_routes" ON public.saved_routes FOR DELETE
  TO authenticated USING (auth.uid() = passenger_id);

-- auto-create a profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
