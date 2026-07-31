'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button, Input } from '@/components/ui';

export default function Home() {
  const router = useRouter();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');

  const search = () => {
    const q = new URLSearchParams({ ...(origin && { origin }), ...(destination && { destination }), ...(date && { date }) });
    router.push(`/search?${q.toString()}`);
  };

  return (
    <div className="space-y-10">
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 p-8 text-white">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Travel Nigeria with verified drivers</h1>
        <p className="mt-2 max-w-lg text-brand-50">Compare intercity trips, book your seat in advance and pay securely. Every driver is verified.</p>
        <div className="mt-6 grid gap-3 rounded-2xl bg-white/95 p-4 text-gray-900 sm:grid-cols-4">
          <Input placeholder="From (e.g. Lagos)" value={origin} onChange={(e) => setOrigin(e.target.value)} />
          <Input placeholder="To (e.g. Ibadan)" value={destination} onChange={(e) => setDestination(e.target.value)} />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button onClick={search}>Search trips</Button>
        </div>
      </motion.section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ['✅ Verified drivers', 'Drivers are approved before they can publish trips.'],
          ['🔒 Secure booking', 'Reserve your seat and get a booking reference instantly.'],
          ['📱 Real data', 'Powered by Supabase — real database, auth and storage.'],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="font-bold">{t}</div>
            <p className="mt-1 text-sm text-gray-500">{d}</p>
          </div>
        ))}
      </section>

      <div className="text-center text-sm text-gray-500">
        Are you a car owner? <Link href="/register" className="font-semibold text-brand-600">Become a driver →</Link>
      </div>
    </div>
  );
}
