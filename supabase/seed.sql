-- ============================================================
-- NaijaRide — seed data (run AFTER schema.sql).
-- Inserts sample verified drivers, vehicles and upcoming trips
-- so /search returns results right away.
-- Prices are in KOBO. depart_at is relative to now().
-- ============================================================

-- Sample driver profiles (fixed UUIDs; no login attached — display only).
insert into public.profiles (id, role, first_name, last_name, phone, is_verified, kyc_status, rating_average, rating_count)
values
  ('11111111-1111-1111-1111-111111111111','DRIVER','Musa','Adeyemi','+2348030000001', true,'VERIFIED',4.8,24),
  ('22222222-2222-2222-2222-222222222222','DRIVER','Ngozi','Okeke','+2348030000002', true,'VERIFIED',4.9,41),
  ('33333333-3333-3333-3333-333333333333','DRIVER','Emeka','Obi','+2348030000003', true,'VERIFIED',4.7,18)
on conflict (id) do nothing;

insert into public.vehicles (id, driver_id, make, model, year, colour, plate_number, seats, has_ac, status)
values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Toyota','Sienna',2019,'Silver','LAG-123XY',6,true,'APPROVED'),
  ('aaaaaaaa-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Toyota','Hiace',2020,'White','ABJ-456AB',4,true,'APPROVED'),
  ('aaaaaaaa-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333','Mercedes','Sprinter',2018,'Grey','EDO-789CD',6,true,'APPROVED')
on conflict (id) do nothing;

insert into public.trips (driver_id, vehicle_id, departure_state, departure_city, destination_state, destination_city, pickup_point, dropoff_point, depart_at, departure_time, total_seats, available_seats, price_per_seat, luggage_allowance, description)
values
  ('11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000001','Lagos','Lagos','Oyo','Ibadan','Ojota Bus Stop','Iwo Road', now() + interval '1 day' + interval '7 hours 30 minutes','07:30',5,5,500000,'1 bag per seat','Comfortable AC ride, morning departure. Water provided.'),
  ('22222222-2222-2222-2222-222222222222','aaaaaaaa-0000-0000-0000-000000000002','FCT','Abuja','Kaduna','Kaduna','Berger Junction','Kawo Park', now() + interval '1 day' + interval '9 hours','09:00',4,4,700000,'1 bag per seat','Express intercity trip with a verified driver.'),
  ('33333333-3333-3333-3333-333333333333','aaaaaaaa-0000-0000-0000-000000000003','Lagos','Lagos','Edo','Benin City','Berger Ojodu','Ring Road', now() + interval '2 days' + interval '6 hours','06:00',6,6,1200000,'2 bags per seat','Long-distance AC coach, early start.'),
  ('11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000001','Lagos','Lagos','Ogun','Abeokuta','Ikeja Along','Kuto', now() + interval '1 day' + interval '16 hours 30 minutes','16:30',5,5,300000,'1 bag per seat','Afternoon ride, spacious vehicle.'),
  ('22222222-2222-2222-2222-222222222222','aaaaaaaa-0000-0000-0000-000000000002','Rivers','Port Harcourt','Abia','Aba','Waterlines','Aba Park', now() + interval '2 days' + interval '8 hours','08:00',4,4,350000,'1 bag per seat','Reliable morning trip.'),
  ('33333333-3333-3333-3333-333333333333','aaaaaaaa-0000-0000-0000-000000000003','Enugu','Enugu','Anambra','Onitsha','Holy Ghost','Upper Iweka', now() + interval '3 days' + interval '10 hours','10:00',6,6,400000,'1 bag per seat','Comfortable, verified and insured.');
