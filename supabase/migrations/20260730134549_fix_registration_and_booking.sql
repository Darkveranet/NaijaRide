/*
# Fix registration trigger and add atomic booking function

1. Changes to existing functions
- `handle_new_user()` trigger now reads `role` and `phone` from `raw_user_meta_data` so profiles are created with the correct role and phone at signup time. This fixes the registration race condition where the profile update failed because the session wasn't established yet.

2. New Functions
- `book_trip(p_trip_id uuid, p_passenger_id uuid, p_seats integer)` — SECURITY DEFINER function that atomically inserts a booking AND decrements the trip's available_seats in a single transaction. This bypasses the RLS restriction where passengers cannot update trips (only the driver can). Returns the booking row with the booking_reference.

3. Security
- The function is SECURITY DEFINER so it can update the trips table despite RLS.
- It validates that seats are available, the trip is scheduled and in the future, and the passenger isn't the driver.
- It does NOT allow overbooking (available_seats >= p_seats check).
*/

-- Drop and recreate the trigger function to capture role + phone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'passenger')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Atomic booking function
CREATE OR REPLACE FUNCTION public.book_trip(
  p_trip_id uuid,
  p_passenger_id uuid,
  p_seats integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip public.trips%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_total integer;
BEGIN
  -- Lock the trip row to prevent concurrent overbooking
  SELECT * INTO v_trip
  FROM public.trips
  WHERE id = p_trip_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Trip not found');
  END IF;

  IF v_trip.status != 'scheduled' THEN
    RETURN json_build_object('error', 'This trip is no longer available for booking');
  END IF;

  IF v_trip.driver_id = p_passenger_id THEN
    RETURN json_build_object('error', 'You cannot book your own trip');
  END IF;

  IF v_trip.available_seats < p_seats THEN
    RETURN json_build_object('error', 'Not enough seats available');
  END IF;

  IF v_trip.departure_time <= now() THEN
    RETURN json_build_object('error', 'This trip has already departed');
  END IF;

  v_total := v_trip.price_per_seat * p_seats;

  -- Insert the booking
  INSERT INTO public.bookings (trip_id, passenger_id, seats_booked, total_amount, status)
  VALUES (p_trip_id, p_passenger_id, p_seats, v_total, 'confirmed')
  RETURNING * INTO v_booking;

  -- Decrement available seats
  UPDATE public.trips
  SET available_seats = available_seats - p_seats
  WHERE id = p_trip_id;

  RETURN json_build_object(
    'id', v_booking.id,
    'booking_reference', v_booking.booking_reference,
    'seats_booked', v_booking.seats_booked,
    'total_amount', v_booking.total_amount
  );
END;
$$;
