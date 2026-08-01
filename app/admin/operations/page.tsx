'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { formatNaira, formatDateTime } from '@/lib/constants';
import {
  Loader2, Undo2, MessageSquareWarning, Megaphone, Download, UserX, ShieldCheck, RotateCcw,
} from 'lucide-react';

export default function AdminOperationsPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!loading && profile && profile.role !== 'admin') { router.push('/dashboard'); return; }
    if (!loading && profile?.role === 'admin') setReady(true);
  }, [user, profile, loading, router]);

  if (loading || !ready) {
    return <div className="min-h-screen"><Navbar /><div className="container py-8 space-y-4"><Skeleton className="h-9 w-64" /><Skeleton className="h-64" /></div></div>;
  }

  return (
    <div className="min-h-screen"><Navbar />
      <div className="container py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Operations</h1>
          <p className="text-sm text-muted-foreground">Refunds, disputes, broadcasts, reports and account controls.</p>
        </div>
        <Tabs defaultValue="refunds">
          <TabsList className="flex-wrap">
            <TabsTrigger value="refunds">Refunds</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
            <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>
          <TabsContent value="refunds" className="mt-4"><RefundsTab /></TabsContent>
          <TabsContent value="disputes" className="mt-4"><DisputesTab /></TabsContent>
          <TabsContent value="broadcast" className="mt-4"><BroadcastTab /></TabsContent>
          <TabsContent value="reports" className="mt-4"><ReportsTab /></TabsContent>
          <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}

/* ---------------- Refunds ---------------- */
function RefundsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('id, booking_reference, total_amount, status, payment_status, created_at, trip:trips!bookings_trip_id_fkey(origin,destination)')
      .in('payment_status', ['paid'])
      .order('created_at', { ascending: false }).limit(50);
    setRows((data || []) as any[]); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const refund = async (id: string) => {
    if (!confirm('Refund this booking? This reverses the driver\u2019s earnings and returns the seats.')) return;
    setBusy(id);
    const { data, error } = await supabase.rpc('admin_refund_booking', { p_booking: id, p_amount: null, p_ref: null });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    const r = data as { error?: string };
    if (r?.error) { toast.error(r.error); return; }
    toast.success('Refunded'); load();
  };

  if (loading) return <Skeleton className="h-40" />;
  if (!rows.length) return <Empty text="No paid bookings to refund." />;
  return (
    <div className="space-y-2">
      {rows.map((b) => (
        <Card key={b.id}><CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-semibold">Ref {b.booking_reference} · {formatNaira(b.total_amount)}</p>
            <p className="text-xs text-muted-foreground">{b.trip?.origin} → {b.trip?.destination} · {formatDateTime(b.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{b.payment_status}</Badge>
            <Button size="sm" variant="outline" className="gap-1.5 text-destructive" disabled={busy === b.id} onClick={() => refund(b.id)}>
              {busy === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />} Refund
            </Button>
          </div>
        </CardContent></Card>
      ))}
    </div>
  );
}

/* ---------------- Disputes ---------------- */
function DisputesTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from('disputes').select('*').order('created_at', { ascending: false }).limit(50);
    setRows((data || []) as any[]); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resolve = async (id: string, status: string) => {
    setBusy(id);
    const { error } = await supabase.rpc('admin_resolve_dispute', { p_id: id, p_status: status, p_resolution: null });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked ${status}`); load();
  };

  if (loading) return <Skeleton className="h-40" />;
  if (!rows.length) return <Empty text="No disputes." />;
  return (
    <div className="space-y-2">
      {rows.map((d) => (
        <Card key={d.id}><CardContent className="flex items-start justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold">{d.subject}</p>
            {d.detail && <p className="text-xs text-muted-foreground">{d.detail}</p>}
            <p className="text-[11px] text-muted-foreground">{formatDateTime(d.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={d.status === 'resolved' ? 'bg-success/10 text-success' : d.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'}>{d.status}</Badge>
            {d.status !== 'resolved' && d.status !== 'rejected' && (
              <>
                <Button size="sm" variant="outline" disabled={busy === d.id} onClick={() => resolve(d.id, 'resolved')}>{busy === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Resolve'}</Button>
                <Button size="sm" variant="outline" className="text-destructive" disabled={busy === d.id} onClick={() => resolve(d.id, 'rejected')}>Reject</Button>
              </>
            )}
          </div>
        </CardContent></Card>
      ))}
    </div>
  );
}

/* ---------------- Broadcast ---------------- */
function BroadcastTab() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'passengers' | 'drivers'>('all');
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) { toast.error('Title and message required'); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc('admin_broadcast', { p_title: title, p_body: body, p_audience: audience });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const r = data as { sent?: number };
    toast.success(`Sent to ${r?.sent ?? 0} users`); setTitle(''); setBody('');
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Megaphone className="h-5 w-5" /> Broadcast announcement</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={send} className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Festive season update" /></div>
          <div className="space-y-2"><Label>Message</Label><Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your announcement…" /></div>
          <div className="space-y-2">
            <Label>Audience</Label>
            <div className="flex gap-2">
              {(['all', 'passengers', 'drivers'] as const).map((a) => (
                <button key={a} type="button" onClick={() => setAudience(a)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium capitalize ${audience === a ? 'border-primary bg-primary/10 text-primary' : 'border-input'}`}>{a}</button>
              ))}
            </div>
          </div>
          <Button type="submit" className="gap-2" disabled={busy}>{busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><Megaphone className="h-4 w-4" /> Send broadcast</>}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* ---------------- Reports / CSV export ---------------- */
function ReportsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from('admin_bookings_report').select('*').order('created_at', { ascending: false }).limit(1000)
      .then(({ data }) => { setRows((data || []) as any[]); setLoading(false); });
  }, []);

  const totals = useMemo(() => {
    const paid = rows.filter((r) => r.payment_status === 'paid');
    return {
      count: rows.length,
      gmv: paid.reduce((s, r) => s + (r.total_amount || 0), 0),
      commission: paid.reduce((s, r) => s + (r.commission || 0), 0),
    };
  }, [rows]);

  const exportCsv = () => {
    if (!rows.length) { toast.error('Nothing to export'); return; }
    const cols = Object.keys(rows[0]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `naijaride-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading) return <Skeleton className="h-40" />;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Bookings report</CardTitle>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Bookings" value={String(totals.count)} />
          <Stat label="GMV (paid)" value={formatNaira(totals.gmv)} />
          <Stat label="Commission" value={formatNaira(totals.commission)} />
        </div>
        <div className="max-h-96 space-y-1 overflow-auto">
          {rows.slice(0, 100).map((r, i) => (
            <div key={i} className="flex items-center justify-between border-b border-border/40 py-2 text-sm">
              <span>{r.booking_reference} · {r.origin} → {r.destination}</span>
              <span className="text-muted-foreground">{formatNaira(r.total_amount)} · {r.status}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Users / suspend ---------------- */
function UsersTab() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    let query = supabase.from('profiles').select('id, full_name, role, account_status, phone').order('created_at', { ascending: false }).limit(50);
    if (q.trim()) query = query.ilike('full_name', `%${q.trim()}%`);
    const { data } = await query;
    setRows((data || []) as any[]); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const setStatus = async (id: string, status: string) => {
    setBusy(id);
    const { error } = await supabase.rpc('admin_set_account_status', { p_user: id, p_status: status });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Account ${status}`); load();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Accounts</CardTitle></CardHeader>
      <CardContent>
        <div className="mb-3 flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" onKeyDown={(e) => e.key === 'Enter' && load()} />
          <Button variant="outline" onClick={load}>Search</Button>
        </div>
        {loading ? <Skeleton className="h-40" /> : rows.map((u) => (
          <div key={u.id} className="flex items-center justify-between border-b border-border/40 py-3 text-sm">
            <div>
              <p className="font-medium">{u.full_name || 'Unnamed'} <span className="text-xs text-muted-foreground">· {u.role}</span></p>
              <p className="text-xs text-muted-foreground">{u.phone || '—'}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={u.account_status === 'active' ? 'bg-success/10 text-success' : u.account_status === 'suspended' ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'}>{u.account_status}</Badge>
              {u.account_status === 'active' ? (
                <>
                  <Button size="sm" variant="outline" className="gap-1.5" disabled={busy === u.id} onClick={() => setStatus(u.id, 'suspended')}>{busy === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />} Suspend</Button>
                  <Button size="sm" variant="outline" className="text-destructive" disabled={busy === u.id} onClick={() => setStatus(u.id, 'banned')}>Ban</Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="gap-1.5" disabled={busy === u.id} onClick={() => setStatus(u.id, 'active')}><RotateCcw className="h-3.5 w-3.5" /> Reactivate</Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border/60 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-display text-xl font-bold">{value}</p></div>;
}
function Empty({ text }: { text: string }) {
  return <Card className="border-dashed"><CardContent className="py-12 text-center text-sm text-muted-foreground">{text}</CardContent></Card>;
}
