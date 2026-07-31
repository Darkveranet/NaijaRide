import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, CreditCard, ShieldCheck, Car, User, HelpCircle } from 'lucide-react';

export const metadata = { title: 'Help Centre — NaijaRide' };

export default function HelpPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <HelpCircle className="h-6 w-6" />
          </div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Help Centre</h1>
          <p className="mt-3 text-muted-foreground">
            Find answers to common questions about booking, driving, payments, and safety.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl">
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Search, title: 'Booking', desc: 'Search, reserve, and manage trips' },
              { icon: CreditCard, title: 'Payments', desc: 'Paystack, refunds, and pricing' },
              { icon: ShieldCheck, title: 'Safety', desc: 'Verification and trust' },
              { icon: Car, title: 'Driving', desc: 'Become a driver and earn' },
              { icon: User, title: 'Account', desc: 'Profile, settings, and login' },
            ].map((c) => (
              <Card key={c.title} className="transition-all hover:shadow-md">
                <CardContent className="p-5">
                  <c.icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-3 font-semibold">{c.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="q1">
                  <AccordionTrigger>How do I book a trip?</AccordionTrigger>
                  <AccordionContent>
                    Go to Find Trips, enter your departure and destination cities, browse available trips, select your seats, and pay securely via Paystack. You&apos;ll receive an instant booking confirmation.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2">
                  <AccordionTrigger>How do I become a driver?</AccordionTrigger>
                  <AccordionContent>
                    Sign up with the driver role, complete NIN verification and vehicle inspection on your driver dashboard. Once approved by our admin team, you can publish trips and start earning.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q3">
                  <AccordionTrigger>What payment methods are accepted?</AccordionTrigger>
                  <AccordionContent>
                    We accept card payments, bank transfers, and USSD via Paystack. Your money is held securely until the trip is confirmed.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q4">
                  <AccordionTrigger>Can I cancel a booking?</AccordionTrigger>
                  <AccordionContent>
                    Yes, you can cancel from your dashboard. Refunds are processed back to your original payment method within 3-5 business days.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q5">
                  <AccordionTrigger>How are drivers verified?</AccordionTrigger>
                  <AccordionContent>
                    Every driver passes NIN verification, KYC checks, and vehicle inspection before they can publish trips. We also maintain a two-way rating system.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
