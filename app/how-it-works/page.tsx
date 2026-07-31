'use client';

import Link from 'next/link';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  CreditCard,
  Car,
  ShieldCheck,
  Users,
  Star,
  MapPin,
  Clock,
  Bell,
  CheckCircle2,
} from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border/60 bg-secondary/30 py-16">
        <div className="container mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">
            Simple & Secure
          </Badge>
          <h1 className="font-display text-3xl font-bold sm:text-4xl text-balance">
            How NaijaRide Works
          </h1>
          <p className="mt-4 text-lg text-muted-foreground text-balance">
            Whether you&apos;re travelling or driving, NaijaRide makes intercity trips
            safe, affordable, and effortless.
          </p>
        </div>
      </section>

      {/* For passengers */}
      <section className="py-16">
        <div className="container">
          <h2 className="mb-2 font-display text-2xl font-bold">For Passengers</h2>
          <p className="mb-8 text-muted-foreground">Find and book your next trip in minutes</p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Search, title: '1. Search Trips', desc: 'Enter your origin, destination, and date. Filter by price, vehicle type, and departure time to find the perfect ride.' },
              { icon: ShieldCheck, title: '2. Choose a Verified Driver', desc: 'Browse driver profiles, ratings, and vehicle details. Every driver is NIN-verified with a valid licence and insurance.' },
              { icon: CreditCard, title: '3. Book & Pay Securely', desc: 'Reserve your seats and pay with card, bank transfer, or USSD via Paystack. Get instant confirmation and a booking reference.' },
              { icon: Car, title: '4. Travel & Rate', desc: 'Meet your driver at the pickup point. After the trip, rate your experience to help the community.' },
            ].map((s) => (
              <Card key={s.title}>
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <s.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button size="lg" asChild>
              <Link href="/search">Find a trip now</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* For drivers */}
      <section className="border-y border-border/60 bg-secondary/30 py-16">
        <div className="container">
          <h2 className="mb-2 font-display text-2xl font-bold">For Drivers</h2>
          <p className="mb-8 text-muted-foreground">Turn your intercity drives into income</p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: '1. Get Verified', desc: 'Sign up as a driver, submit your NIN, driver licence, vehicle documents, and a selfie. We verify with NIMC within 48 hours.' },
              { icon: Car, title: '2. Add Your Vehicle', desc: 'Register your car with photos, plate number, and seat count. Our team approves it for safety compliance.' },
              { icon: MapPin, title: '3. Publish Trips', desc: 'Create scheduled trips with your route, departure time, price per seat, and luggage allowance.' },
              { icon: Users, title: '4. Manage Bookings', desc: 'Accept or reject passengers, view their details after payment, and track your earnings in real time.' },
              { icon: CreditCard, title: '5. Get Paid', desc: 'Earnings land in your NaijaRide wallet. Request payouts to your bank account — minus a small platform commission.' },
              { icon: Star, title: '6. Build Your Reputation', desc: 'Deliver great trips, earn 5-star reviews, and climb the rankings to get more bookings.' },
            ].map((s) => (
              <Card key={s.title}>
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                    <s.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button size="lg" asChild>
              <Link href="/register?role=driver">Become a driver</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Safety */}
      <section className="py-16">
        <div className="container mx-auto max-w-3xl">
          <h2 className="mb-8 text-center font-display text-2xl font-bold">Safety First</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: ShieldCheck, title: 'NIN Verification', desc: 'Every driver is verified against the NIMC database.' },
              { icon: CheckCircle2, title: 'Vehicle Inspection', desc: 'Vehicles are reviewed for roadworthiness and insurance.' },
              { icon: CreditCard, title: 'Secure Payments', desc: 'Paystack handles all transactions with bank-grade security.' },
              { icon: Bell, title: 'Trip Alerts', desc: 'WhatsApp and SMS notifications keep you informed at every step.' },
              { icon: Star, title: 'Two-way Ratings', desc: 'Drivers and passengers rate each other after every trip.' },
              { icon: Clock, title: '24/7 Support', desc: 'Our support team is available around the clock for any issues.' },
            ].map((s) => (
              <div key={s.title} className="flex items-start gap-3 rounded-lg border border-border/60 p-4">
                <s.icon className="h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
