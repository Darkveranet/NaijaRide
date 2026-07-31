'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTripSearch } from '@/lib/data';
import { SUPABASE_ENABLED } from '@/lib/supabase';
import { TripCard } from '@/components/TripCard';
import { Input, Skeleton, ConfigNotice } from '@/components/ui';

function SearchInner() {
  const sp = useSearchParams();
  const [maxPrice, setMaxPrice] = useState('');
  const [hasAc, setHasAc] = useState(false);
  const [sort, setSort] = useState('departure');

  const { data, isLoading, error } = useTripSearch({
    origin: sp.get('origin') ?? undefined,
    destination: sp.get('destination') ?? undefined,
    date: sp.get('date') ?? undefined,
    maxPrice: maxPrice ? Number(maxPrice) * 100 : undefined,
    hasAc: hasAc || undefined,
    sort,
  });

  const trips = data ?? [];

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <aside className="space-y-4">
        <h2 className="font-bold">Filters</h2>
        <label className="block text-sm">Max price (₦)
          <Input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="e.g. 8000" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasAc} onChange={(e) => setHasAc(e.target.checked)} /> AC only
        </label>
        <label className="block text-sm">Sort by
          <select className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="departure">Departure time</option>
            <option value="price">Price</option>
          </select>
        </label>
      </aside>

      <section className="space-y-3">
        <h1 className="text-xl font-bold">{sp.get('origin') ?? 'All'} → {sp.get('destination') ?? 'All'}</h1>
        {!SUPABASE_ENABLED && <ConfigNotice />}
        {SUPABASE_ENABLED && isLoading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="rounded-2xl border p-4 space-y-3"><Skeleton className="w-1/3" /><Skeleton className="w-2/3" /></div>)}
        {error && <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">{(error as Error).message}</div>}
        {SUPABASE_ENABLED && !isLoading && trips.length === 0 && <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">No trips found. Try another date or route.</div>}
        {trips.map((t: any) => <TripCard key={t.id} trip={t} />)}
      </section>
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<Skeleton className="h-40" />}><SearchInner /></Suspense>;
}
