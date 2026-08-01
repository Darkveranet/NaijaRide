# Wire real payments into app/trip/page.tsx

Your current trip page books via `book_trip` (instant confirm). To use the new
accept → pay flow, change the booking handler to call `request_booking` and then,
once the driver accepts, let the passenger pay with Paystack.

## Minimal change (passenger pays immediately after requesting)
```tsx
import { payWithPaystack, PAYSTACK_ENABLED } from '@/lib/payments';

const handleBook = async () => {
  setBooking(true);
  // 1) create a booking (pending) with optional promo
  const { data, error } = await supabase.rpc('request_booking', {
    p_trip_id: trip.id, p_seats: seats, p_promo: promo || null,
  });
  setBooking(false);
  if (error) { toast.error(error.message); return; }
  const r = data as { error?: string; id?: string; total_amount?: number; booking_reference?: string };
  if (r?.error) { toast.error(r.error); return; }

  if (PAYSTACK_ENABLED) {
    // 2) pay now via Paystack (webhook confirms the booking + credits the driver)
    await payWithPaystack({ id: r.id!, total_amount: r.total_amount! });
  } else {
    // test flow: mark paid directly (no real charge)
    await supabase.rpc('mark_payment_success', { p_booking_id: r.id, p_ref: 'TEST-' + Date.now(), p_channel: 'test' });
    toast.success(`Booked! Ref ${r.booking_reference}`);
    router.push('/dashboard');
  }
};
```

## Driver accept/reject (driver dashboard)
```tsx
await supabase.rpc('accept_booking', { p_booking_id: id });
await supabase.rpc('reject_booking', { p_booking_id: id });
```

## Trip lifecycle (driver)
```tsx
await supabase.rpc('set_trip_status', { p_trip_id: id, p_status: 'in_progress' });
await supabase.rpc('set_trip_status', { p_trip_id: id, p_status: 'completed' });
```

## Ratings (after completion)
```tsx
await supabase.rpc('submit_review', { p_trip_id: tripId, p_reviewee: driverId, p_rating: 5, p_comment: 'Great!' });
```

## Payout (driver)
```tsx
await supabase.rpc('request_payout', { p_amount: 20000, p_bank_code: '058', p_account_number: '0123456789', p_account_name: 'Musa' });
```
