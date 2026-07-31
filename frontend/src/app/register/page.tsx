'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp, signIn } from '@/lib/data';
import { SUPABASE_ENABLED } from '@/lib/supabase';
import { Button, Input, ConfigNotice } from '@/components/ui';

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'PASSENGER' as 'PASSENGER' | 'DRIVER' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMsg(''); setBusy(true);
    try {
      await signUp(form);
      // If email confirmation is OFF in Supabase, we can sign in immediately.
      try {
        const { role } = await signIn(form.email, form.password);
        router.push(role === 'DRIVER' ? '/dashboard/driver' : '/dashboard/passenger');
      } catch {
        setMsg('Account created! Check your email to confirm, then sign in.');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-extrabold">Create your account</h1>
      {!SUPABASE_ENABLED && <ConfigNotice />}
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="First name" value={form.firstName} onChange={set('firstName')} required />
          <Input placeholder="Last name" value={form.lastName} onChange={set('lastName')} required />
        </div>
        <Input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
        <Input placeholder="Phone (e.g. 08031234567)" value={form.phone} onChange={set('phone')} />
        <Input type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={set('password')} required />
        <div className="flex gap-2">
          {(['PASSENGER', 'DRIVER'] as const).map((r) => (
            <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${form.role === r ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-700/20' : 'border-gray-300 dark:border-gray-700'}`}>
              {r === 'PASSENGER' ? 'Ride' : 'Drive'}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {msg && <p className="text-sm text-brand-600">{msg}</p>}
        <Button className="w-full" type="submit" disabled={busy || !SUPABASE_ENABLED}>{busy ? 'Creating…' : 'Create account'}</Button>
      </form>
      <p className="text-sm text-gray-500">Already have an account? <Link href="/login" className="font-semibold text-brand-600">Sign in</Link></p>
    </div>
  );
}
