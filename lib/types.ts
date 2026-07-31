export type Profile = {
  id: string;
  role: 'passenger' | 'driver' | 'admin';
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  kyc_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  is_verified_driver: boolean;
  rating: number;
  rating_count: number;
  created_at: string;
};

export type Vehicle = {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plate_number: string;
  total_seats: number;
  has_ac: boolean;
  photo_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export type Trip = {
  id: string;
  driver_id: string;
  vehicle_id: string;
  origin: string;
  destination: string;
  departure_time: string;
  price_per_seat: number;
  total_seats: number;
  available_seats: number;
  luggage_allowance: string;
  description: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
};

export type TripWithDriver = Trip & {
  driver: Profile | null;
  vehicle: Vehicle | null;
};

export type Booking = {
  id: string;
  trip_id: string;
  passenger_id: string;
  seats_booked: number;
  total_amount: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  booking_reference: string;
  created_at: string;
};

export type BookingWithTrip = Booking & {
  trip: TripWithDriver | null;
};

export type Review = {
  id: string;
  trip_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type SavedRoute = {
  id: string;
  passenger_id: string;
  origin: string;
  destination: string;
  created_at: string;
};
