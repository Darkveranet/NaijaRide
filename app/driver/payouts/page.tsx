'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { formatNaira, formatDateTime } from '@/lib/constants';
import { Wallet, Banknote, Clock, PiggyBank, Loader2, ArrowDownToLine, History } from 'lucide-react';

type WalletRow = { earnings: number; pending_balance: number; withdrawable_balance: number };
type Tx = { id: string; type: string; amount: number; description: string | null; created_at: string };
type Payout = { id: string; amount: number; status: string; account_number: string | null; created_at: string };

const TX_LABEL: Record<string, string> = {
  credit_earning: 'Earning', debit_commission: 'Commission', debit_payout: 'Payout',
  credit_refund_adj: 'Refund adj.', debit_refund: 'Refund', adjustment: 'Adjustment',
};

export default function PayoutsPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [amount, setAmount] = useState('');
  const [bank, setBank] = useState('');
  const [acct, setAcct] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: w }, { data: t }, { data: p }] = await Promise.all([
      supabase.from('wallets').select('earnings, pending_balance, withdrawable_balance').eq('user_id', user.id).maybeSingle(),
      supabase.from('wallet_transactions').select('id, type, amount, description, created_at').order('created_at', { ascending: false }).limit(20),
      supabase.from('payouts').select('id, amount, status, account_number, created_at').eq('driver_id', user.id).order('created_at', { ascending: false }),
    ]);
    setWallet((w as WalletRow) || { earnings: 0, pending_balance: 0, withdrawable_balance: 0 });
    setTxs((t || []) as Tx[]);
    setPayouts((p || []) as Payout[]);
    setLoadingData(false);
  };

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!loading && profile && profile.role !== 'driver') { router.push('/dashboard'); return; }
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, loading]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    if (wallet && amt > wallet.withdrawable_balance) { toast.error('Amount exceeds withdrawable balance'); return; }
    if (acct.length !== 10) { toast.error('Account number must be 10 digits'); return; }
    setSubmitting(true);
    const { data, error } = await supabase.rpc('request_payout', {
      p_amount: amt, p_bank_code: bank, p_account_number: acct, p_account_name: name || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    const r = data as { error?: string };
    if (r?.error) { toast.error(r.error); return; }
    toast.success('Payout requested');
    setAmount(''); setAcct(''); setName('');
    load();
  };

  if (loading || loadingData) {
    return <div className="min-h-screen"><Navbar /><div className="container py-8 space-y-4"><Skeleton className="h-9 w-56" /><div className="grid gap-4 sm:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div></div></div>;
  }

  return (
    <div className="min-h-screen"><Navbar />
      <div className="container max-w-3xl py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Wallet & Payouts</h1>
            <p className="text-sm text-muted-foreground">Withdraw your earnings to a Nigerian bank account.</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/driver')}>Dashboard</Button>
        </div>

        {/* Balances */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary"><Wallet className="h-4 w-4" /> Withdrawable</div>
              <p className="mt-1 font-display text-3xl font-bold text-primary">{formatNaira(wallet?.withdrawable_balance ?? 0)}</p>
            </CardContent>
          </Card>
          <Card><CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Clock className="h-4 w-4" /> Pending</div>
            <p className="mt-1 font-display text-2xl font-bold">{formatNaira(wallet?.pending_balance ?? 0)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><PiggyBank className="h-4 w-4" /> Lifetime</div>
            <p className="mt-1 font-display text-2xl font-bold">{formatNaira(wallet?.earnings ?? 0)}</p>
          </CardContent></Card>
        </div>

        {/* Request payout */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ArrowDownToLine className="h-5 w-5" /> Request a payout</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Amount (₦) *</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 20000" min={1} required />
                </div>
                <div className="space-y-2">
                  <Label>Bank code *</Label>
                  <Input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="e.g. 058 (GTBank)" required />
                </div>
                <div className="space-y-2">
                  <Label>Account number *</Label>
                  <Input value={acct} onChange={(e) => setAcct(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit NUBAN" required />
                </div>
                <div className="space-y-2">
                  <Label>Account name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <Button type="submit" className="gap-2" disabled={submitting || (wallet?.withdrawable_balance ?? 0) <= 0}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Requesting…</> : <><Banknote className="h-4 w-4" /> Request payout</>}
              </Button>
              <p className="text-xs text-muted-foreground">Payouts are processed by an admin/Paystack transfer. Available balance grows as your trips complete.</p>
            </form>
          </CardContent>
        </Card>

        {/* Payout history */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg">Payout history</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {payouts.length === 0 ? <p className="text-sm text-muted-foreground">No payouts yet.</p> : payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{formatNaira(p.amount)}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(p.created_at)}{p.account_number ? ` · ${p.account_number}` : ''}</p>
                </div>
                <Badge className={p.status === 'paid' ? 'bg-success/10 text-success' : p.status === 'failed' ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'}>{p.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Ledger */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><History className="h-5 w-5" /> Recent transactions</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {txs.length === 0 ? <p className="text-sm text-muted-foreground">No transactions yet.</p> : txs.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b border-border/40 py-2 text-sm last:border-0">
                <div>
                  <p className="font-medium">{TX_LABEL[t.type] || t.type}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(t.created_at)}{t.description ? ` · ${t.description}` : ''}</p>
                </div>
                <span className={`font-semibold ${t.amount < 0 ? 'text-destructive' : 'text-success'}`}>{t.amount < 0 ? '-' : '+'}{formatNaira(Math.abs(t.amount))}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
