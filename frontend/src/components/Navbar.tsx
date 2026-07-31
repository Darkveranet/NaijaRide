'use client';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { SUPABASE_ENABLED } from '@/lib/supabase';

export function Navbar() {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <div className={`px-4 py-1.5 text-center text-xs font-semibold text-white ${SUPABASE_ENABLED ? 'bg-brand-600' : 'bg-amber-500'}`}>
        {SUPABASE_ENABLED ? '🟢 Live — connected to Supabase' : '⚙️ Supabase not configured — see SETUP.md'}
      </div>
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-extrabold">Naija<span className="text-brand-500">Ride</span></Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/search" className="hover:text-brand-600">Find a ride</Link>
            <Link href="/dashboard/driver" className="hover:text-brand-600">Drive</Link>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-900" aria-label="Toggle theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <Link href="/login" className="rounded-xl bg-brand-500 px-3 py-1.5 font-semibold text-white hover:bg-brand-600">Sign in</Link>
          </nav>
        </div>
      </header>
    </>
  );
}
