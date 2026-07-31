'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NIGERIAN_CITIES } from '@/lib/constants';
import {
  ShieldCheck,
  Clock,
  Users,
  Star,
  Car,
  MapPin,
  ArrowRight,
  CreditCard,
  Bell,
  MessageSquare,
  TrendingUp,
  Snowflake,
  Search,
  CheckCircle2,
  Phone,
  Lock,
  Sparkles,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (origin) params.set('origin', origin);
    if (destination) params.set('destination', destination);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: "url('https://images.pexels.com/photos/31817614/pexels-photo-31817614.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-40 top-40 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />

        <div className="container relative py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-6 gap-1.5 border-primary/30 bg-primary/5 py-1.5 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Trusted by thousands of travellers across Nigeria
            </Badge>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Travel Nigeria the{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                smart, safe way
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-balance">
              Book verified car owners for intercity trips. From Lagos to Abuja,
              Port Harcourt to Enugu — affordable fares, trusted drivers, secure
              payments.
            </p>

            {/* Search card */}
            <Card className="mx-auto mt-10 max-w-2xl border-border/60 shadow-xl">
              <CardContent className="p-5">
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <div className="text-left">
                    <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <MapPin className="h-3 w-3" /> From
                    </label>
                    <Select value={origin} onValueChange={setOrigin}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Departure city" />
                      </SelectTrigger>
                      <SelectContent>
                        {NIGERIAN_CITIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-left">
                    <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <MapPin className="h-3 w-3" /> To
                    </label>
                    <Select value={destination} onValueChange={setDestination}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Destination city" />
                      </SelectTrigger>
                      <SelectContent>
                        {NIGERIAN_CITIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      size="lg"
                      className="h-11 w-full gap-2 sm:w-auto"
                      onClick={handleSearch}
                    >
                      <Search className="h-4 w-4" /> Search
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" /> Verified drivers</span>
              <span className="flex items-center gap-1.5"><CreditCard className="h-4 w-4 text-primary" /> Secure Paystack payments</span>
              <span className="flex items-center gap-1.5"><Bell className="h-4 w-4 text-accent" /> Instant booking alerts</span>
            </div>
          </div>
        </div>
      </section>

      {/* Popular routes */}
      <section className="border-y border-border/60 bg-secondary/30 py-16">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Popular Routes</h2>
            <p className="mt-2 text-muted-foreground">Trending intercity trips booked this week</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { from: 'Lagos', to: 'Abuja', price: 18000 },
              { from: 'Lagos', to: 'Ibadan', price: 6000 },
              { from: 'Abuja', to: 'Kano', price: 12000 },
              { from: 'Port Harcourt', to: 'Enugu', price: 9000 },
            ].map((r) => (
              <Link
                key={`${r.from}-${r.to}`}
                href={`/search?origin=${r.from}&destination=${r.to}`}
                className="group"
              >
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <span>{r.from}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        <span>{r.to}</span>
                      </div>
                    </div>
                    <p className="mt-3 font-display text-lg font-bold text-primary">
                      from ₦{r.price.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">per seat</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Why NaijaRide?</h2>
            <p className="mt-2 text-muted-foreground">
              Built for the Nigerian road — trust, safety, and convenience at every step.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: 'Verified Drivers Only', desc: 'Every driver passes NIN verification, KYC checks, and vehicle inspection before publishing trips.', color: 'text-success' },
              { icon: CreditCard, title: 'Secure Payments', desc: 'Pay with cards, bank transfer, or USSD via Paystack. Your money is protected until the trip is confirmed.', color: 'text-primary' },
              { icon: Bell, title: 'Real-time Alerts', desc: 'Get instant notifications via WhatsApp and SMS on booking, reminders, and trip updates.', color: 'text-accent' },
              { icon: Star, title: 'Ratings & Reviews', desc: 'Transparent two-way rating system keeps the community accountable and safe.', color: 'text-warning' },
              { icon: MapPin, title: 'Smart Search', desc: 'Filter trips by price, vehicle type, departure time, and available seats in seconds.', color: 'text-primary' },
              { icon: Lock, title: 'Bank-grade Security', desc: 'Encrypted data, secure authentication, and audit logs protect your information.', color: 'text-destructive' },
            ].map((f) => (
              <Card key={f.title} className="transition-all hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
                    <f.icon className={`h-6 w-6 ${f.color}`} />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/60 bg-secondary/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">How it Works</h2>
            <p className="mt-2 text-muted-foreground">Three simple steps to your next trip</p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { step: '01', icon: Search, title: 'Search & Compare', desc: 'Enter your route and date. Browse verified drivers, compare prices, vehicle types, and ratings.' },
              { step: '02', icon: CreditCard, title: 'Book & Pay', desc: 'Reserve your seats and pay securely with Paystack. Get instant confirmation and a booking reference.' },
              { step: '03', icon: Car, title: 'Travel Safe', desc: 'Meet your driver at the pickup point. Track your trip and rate your experience afterwards.' },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <s.icon className="h-6 w-6" />
                  </div>
                  <span className="font-display text-3xl font-bold text-muted/40">{s.step}</span>
                </div>
                <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Driver CTA */}
      <section className="py-20">
        <div className="container">
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
            <CardContent className="grid items-center gap-8 p-8 lg:grid-cols-2 lg:p-12">
              <div>
                <Badge className="mb-4 gap-1.5 bg-primary/10 text-primary">
                  <TrendingUp className="h-3.5 w-3.5" /> Earn with your car
                </Badge>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">
                  Become a driver and earn on every trip
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Turn your daily intercity drives into income. Get verified,
                  publish trips, and connect with passengers heading your way.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button size="lg" asChild>
                    <Link href="/register?role=driver">Start driving</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/how-it-works">Learn more</Link>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: ShieldCheck, label: 'NIN Verified Badge' },
                  { icon: CreditCard, label: 'Instant Secure Payouts' },
                  { icon: Users, label: 'Manage Multiple Vehicles' },
                  { icon: Star, label: 'Build Your Reputation' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
                    <item.icon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
