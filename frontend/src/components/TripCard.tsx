'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatNaira } from '@/lib/supabase';
import { VerifiedBadge } from './ui';

export function TripCard({ trip }: { trip: any }) {
  const driver = trip.driver?.user;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-lg transition">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">{trip.departAt && new Date(trip.departAt).toLocaleString('en-NG')}</div>
          <div className="text-lg font-bold">{trip.departureCity} → {trip.destinationCity}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold text-brand-600">{formatNaira(trip.pricePerSeat)}</div>
          <div className="text-xs text-gray-500">per seat</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{driver?.firstName ?? 'Driver'}</span>
          {trip.driver?.isVerified && <VerifiedBadge />}
          <span className="text-gray-400">· {trip.vehicle?.make} {trip.vehicle?.model}{trip.vehicle?.hasAc ? ' · AC' : ''}</span>
        </div>
        <Link href={`/trip?id=${trip.id}`} className="text-sm font-semibold text-brand-600 hover:underline">View · {trip.availableSeats} seats</Link>
      </div>
    </motion.div>
  );
}
