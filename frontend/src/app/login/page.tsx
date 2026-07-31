'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from '@/lib/data';
import { SUPABASE_ENABLED } from '@/lib/supabase';
import { Button, Input, ConfigNotice } from '@/components/ui';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const { role } = await signIn(email, password);
      router.push(role === 'DRIVER' ? '/dashboard/driver' : role === 'ADMIN' ? '/admin' : '/dashboard/passenger');
    } catch (err: any) {
      setError(err?.message ?? 'Login failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-extrabold">Welcome back</h1>
      {!SUPABASE_ENABLED && <ConfigNotice />}
      <form onSubmit={submit} className="space-y-3">
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button className="w-full" type="submit" disabled={busy || !SUPABASE_ENABLED}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      <p className="text-sm text-gray-500">No account? <Link href="/register" className="font-semibold text-brand-600">Create one</Link></p>
    </div>
  );
}
