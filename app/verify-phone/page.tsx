'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { Phone, Loader2, ShieldCheck, RefreshCw } from 'lucide-react';

export default function VerifyPhonePage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [loading, user, router]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendCode = async () => {
    setSending(true);
    const { data, error } = await supabase.rpc('generate_otp', { p_purpose: 'phone_verification' });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    const r = data as { error?: string; sent?: boolean };
    if (r?.error) { toast.error(r.error); return; }
    setSent(true);
    setCooldown(30);
    toast.success('Code sent — check your SMS/WhatsApp.');
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setVerifying(true);
    const { data, error } = await supabase.rpc('verify_otp', { p_code: code, p_purpose: 'phone_verification' });
    setVerifying(false);
    if (error) { toast.error(error.message); return; }
    const r = data as { error?: string; verified?: boolean };
    if (r?.error) { toast.error(r.error); return; }
    toast.success('Phone verified!');
    router.push(profile?.role === 'driver' ? '/driver' : '/dashboard');
  };

  if (loading) return <div className="min-h-screen"><Navbar /></div>;

  return (
    <div className="min-h-screen"><Navbar />
      <div className="container max-w-md py-12">
        <Card>
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-center text-xl">Verify your phone</CardTitle>
            <p className="text-center text-sm text-muted-foreground">
              {profile?.phone ? `We'll send a 6-digit code to ${profile.phone}.` : 'Add a phone number to your profile first, then verify it here.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!sent ? (
              <Button className="w-full gap-2" onClick={sendCode} disabled={sending}>
                {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><ShieldCheck className="h-4 w-4" /> Send code</>}
              </Button>
            ) : (
              <form onSubmit={verify} className="space-y-4">
                <div className="space-y-2">
                  <Label>Enter 6-digit code</Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    inputMode="numeric"
                    className="text-center text-2xl tracking-[0.5em]"
                    maxLength={6}
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={verifying}>
                  {verifying ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : 'Verify'}
                </Button>
                <Button type="button" variant="ghost" className="w-full gap-2" onClick={sendCode} disabled={cooldown > 0 || sending}>
                  <RefreshCw className="h-4 w-4" /> {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </Button>
              </form>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Codes expire in 10 minutes. In development the code is also shown in your in-app notifications until an SMS provider is connected.
            </p>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
