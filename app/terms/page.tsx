import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Terms of Service — NaijaRide' };

export default function TermsPage() {
  const sections = [
    {
      title: '1. Acceptance of Terms',
      body: 'By using NaijaRide, you agree to these terms. If you do not agree, please do not use the platform.',
    },
    {
      title: '2. User Accounts',
      body: 'You must provide accurate information when registering. You are responsible for keeping your account credentials secure.',
    },
    {
      title: '3. Booking and Payment',
      body: 'When you book a trip, you agree to pay the listed fare. Payments are processed securely via Paystack. Booking confirmations are sent instantly.',
    },
    {
      title: '4. Driver Responsibilities',
      body: 'Drivers must hold a valid driver\'s licence, maintain roadworthy vehicles, and adhere to all traffic laws. NaijaRide reserves the right to suspend drivers who violate these terms.',
    },
    {
      title: '5. Cancellations and Refunds',
      body: 'Bookings can be cancelled from your dashboard. Refunds are processed to the original payment method within 3-5 business days.',
    },
    {
      title: '6. Liability',
      body: 'NaijaRide acts as a marketplace connecting passengers and drivers. We are not liable for incidents during trips but enforce verification to minimise risk.',
    },
    {
      title: '7. Privacy',
      body: 'Your personal data is encrypted and used only to provide and improve our services. We do not sell your data to third parties.',
    },
    {
      title: '8. Changes to Terms',
      body: 'We may update these terms from time to time. Continued use of the platform constitutes acceptance of the updated terms.',
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: July 2026</p>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {sections.map((s) => (
                <div key={s.title}>
                  <h3 className="font-display text-base font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
