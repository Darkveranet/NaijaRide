'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import {
  Car,
  Menu,
  LayoutDashboard,
  Search,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Truck,
  QrCode,
  Phone,
  ShieldAlert,
  Plug,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/search', label: 'Find Trips' },
  { href: '/how-it-works', label: 'How it Works' },
];

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const initials = (profile?.full_name || user?.email || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const dashboardHref =
    profile?.role === 'driver'
      ? '/driver'
      : profile?.role === 'admin'
      ? '/admin'
      : '/dashboard';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Car className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">
              Naija<span className="text-primary">Ride</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary',
                  pathname === link.href
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:block">
                    {profile?.full_name?.split(' ')[0] || 'Account'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {profile?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                {profile?.is_verified_driver && (
                  <Badge className="mx-2 mb-1 gap-1 bg-success/10 text-success">
                    <ShieldCheck className="h-3 w-3" /> Verified Driver
                  </Badge>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(dashboardHref)}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/search')}>
                  <Search className="mr-2 h-4 w-4" /> Find Trips
                </DropdownMenuItem>
                {profile?.role === 'driver' && (
                  <DropdownMenuItem onClick={() => router.push('/driver/trips/new')}>
                    <Truck className="mr-2 h-4 w-4" /> Create Trip
                  </DropdownMenuItem>
                )}
                {profile?.role === 'driver' && (
                  <DropdownMenuItem onClick={() => router.push('/verify-booking')}>
                    <QrCode className="mr-2 h-4 w-4" /> Verify passenger
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => router.push('/emergency-contacts')}>
                  <ShieldAlert className="mr-2 h-4 w-4" /> Emergency Contacts
                </DropdownMenuItem>
                {profile?.role === 'admin' && (
                  <DropdownMenuItem onClick={() => router.push('/admin/integrations')}>
                    <Plug className="mr-2 h-4 w-4" /> Integrations
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => router.push('/verify-phone')}>
                  <Phone className="mr-2 h-4 w-4" /> Verify phone
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    router.push('/');
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get started</Link>
              </Button>
            </div>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col gap-2 pt-6">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        'rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary',
                        pathname === link.href
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      )}
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
                <div className="my-2 h-px bg-border" />
                <div className="px-3">
                  <ThemeToggle />
                </div>
                {user ? (
                  <>
                    <SheetClose asChild>
                      <Button variant="outline" asChild className="w-full">
                        <Link href={dashboardHref}>Dashboard</Link>
                      </Button>
                    </SheetClose>
                    <Button
                      variant="ghost"
                      className="w-full text-destructive"
                      onClick={async () => {
                        await signOut();
                        router.push('/');
                        setOpen(false);
                      }}
                    >
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button variant="outline" asChild className="w-full">
                        <Link href="/login">Sign in</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild className="w-full">
                        <Link href="/register">Get started</Link>
                      </Button>
                    </SheetClose>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
