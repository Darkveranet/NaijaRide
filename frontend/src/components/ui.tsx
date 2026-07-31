'use client';
import clsx from 'clsx';
import { ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

export function Button({ className, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[.98] disabled:opacity-50',
        variant === 'primary' && 'bg-brand-500 text-white hover:bg-brand-600',
        variant === 'outline' && 'border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900',
        variant === 'ghost' && 'hover:bg-gray-100 dark:hover:bg-gray-900',
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx('w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500', className)} {...props} />;
}

export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-700/20 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:text-brand-100">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>
      Verified Driver
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton h-4 w-full', className)} />;
}

export function ConfigNotice() {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-6 text-sm">
      <div className="font-bold text-amber-800 dark:text-amber-200">⚙️ Connect Supabase to load live data</div>
      <p className="mt-2 text-amber-700 dark:text-amber-300">
        Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (locally in
        <code> .env.local</code>, or as GitHub Pages repository variables) and run the SQL in
        <code> supabase/schema.sql</code> + <code>supabase/seed.sql</code>. See <code>docs/SUPABASE.md</code>.
      </p>
    </div>
  );
}
