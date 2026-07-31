'use client';
import { useAdminAnalytics, usePendingDrivers, setDriverVerified, useInvalidate } from '@/lib/data';
import { SUPABASE_ENABLED } from '@/lib/supabase';
import { Skeleton, ConfigNotice } from '@/components/ui';

export default function AdminDashboard() {
  const stats = useAdminAnalytics();
  const pending = usePendingDrivers();
  const invalidate = useInvalidate();

  const decide = async (userId: string, approve: boolean) => {
    await setDriverVerified(userId, approve);
    invalidate(['pending-drivers', 'admin-analytics']);
  };

  if (!SUPABASE_ENABLED) return <ConfigNotice />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Admin dashboard</h1>
      {stats.isLoading ? <Skeleton className="h-20" /> : (
        <div className="grid gap-3 sm:grid-cols-4">
          {Object.entries(stats.data ?? {}).map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="text-xs text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</div>
              <div className="mt-1 text-lg font-extrabold">{String(v)}</div>
            </div>
          ))}
        </div>
      )}

      <section>
        <h2 className="mb-2 font-bold">Pending driver verifications</h2>
        {pending.isLoading && <Skeleton className="h-20" />}
        {!pending.isLoading && (pending.data ?? []).length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center text-gray-500">No pending drivers.</div>}
        <div className="space-y-2">
          {(pending.data ?? []).map((k: any) => (
            <div key={k.id} className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-sm">
              <span>{k.user.firstName} {k.user.lastName} · {k.user.phone}</span>
              <span className="flex gap-2">
                <button onClick={() => decide(k.user.id, true)} className="rounded-lg bg-brand-500 px-3 py-1 font-semibold text-white">Approve</button>
                <button onClick={() => decide(k.user.id, false)} className="rounded-lg border px-3 py-1 font-semibold">Reject</button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
