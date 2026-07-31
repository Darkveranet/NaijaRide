import Link from 'next/link';
import { Car, Mail, Phone, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-secondary/30">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Car className="h-4 w-4" />
              </div>
              <span className="font-display text-lg font-bold">
                Naija<span className="text-primary">Ride</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Safe, affordable intercity car trips across Nigeria. Travel with
              verified drivers you can trust.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/search" className="hover:text-primary">Find Trips</Link></li>
              <li><Link href="/how-it-works" className="hover:text-primary">How it Works</Link></li>
              <li><Link href="/register" className="hover:text-primary">Become a Driver</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/help" className="hover:text-primary">Help Centre</Link></li>
              <li><Link href="/safety" className="hover:text-primary">Safety</Link></li>
              <li><Link href="/terms" className="hover:text-primary">Terms</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello@naijaride.ng</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> +234 800 NAIRIDE</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} NaijaRide. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            Verified drivers only · Secure payments
          </div>
        </div>
      </div>
    </footer>
  );
}
