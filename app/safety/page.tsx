import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck, BadgeCheck, Star, Lock, Phone, FileCheck } from 'lucide-react';

export const metadata = { title: 'Safety — NaijaRide' };

export default function SafetyPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-success text-success-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Safety First</h1>
          <p className="mt-3 text-muted-foreground">
            We take your safety seriously. Here&apos;s how we keep every trip secure.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
          {[
            { icon: BadgeCheck, title: 'Verified Drivers', desc: 'Every driver passes NIN verification and KYC checks before they can offer trips.' },
            { icon: FileCheck, title: 'Vehicle Inspection', desc: 'All vehicles undergo inspection to ensure roadworthiness before approval.' },
            { icon: Star, title: 'Two-way Ratings', desc: 'Passengers and drivers rate each other, keeping the community accountable.' },
            { icon: Lock, title: 'Secure Payments', desc: 'Payments are encrypted and held by Paystack until trip confirmation.' },
            { icon: Phone, title: '24/7 Support', desc: 'Reach our virtual assistant anytime for help with any trip issue.' },
            { icon: ShieldCheck, title: 'Data Protection', desc: 'Your personal data is encrypted and never shared without consent.' },
          ].map((f) => (
            <Card key={f.title} className="transition-all hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                  <f.icon className="h-6 w-6 text-success" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
