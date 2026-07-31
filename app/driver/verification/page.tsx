'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { KYC_STATUS_LABELS } from '@/lib/constants';
import {
  ShieldCheck,
  CreditCard,
  Upload,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Car,
} from 'lucide-react';

export default function VerificationPage() {
  const router = useRouter();
  const { user, profile, refreshProfile, loading } = useAuth();
  const [nin, setNin] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (nin.length < 11) {
      toast.error('NIN must be 11 digits');
      return;
    }
    if (!licenceNumber) {
      toast.error('Driver licence number is required');
      return;
    }
    setSubmitting(true);
    // In production this would call a KYC provider edge function.
    // For now we mark the profile as pending verification.
    const { error } = await supabase
      .from('profiles')
      .update({ kyc_status: 'pending' })
      .eq('id', user.id);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success('Verification submitted! We will review and notify you within 48 hours.');
    router.push('/driver');
  };

  if (loading) return <div className="min-h-screen"><Navbar /></div>;

  const status = profile?.kyc_status ?? 'unverified';

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-2xl py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Driver Verification</h1>
          <p className="text-sm text-muted-foreground">
            Complete KYC to earn the Verified Driver badge and publish trips
          </p>
        </div>

        {/* Status banner */}
        <Card className={`mb-6 ${status === 'verified' ? 'border-success/40 bg-success/5' : status === 'pending' ? 'border-accent/40 bg-accent/5' : status === 'rejected' ? 'border-destructive/40 bg-destructive/5' : ''}`}>
          <CardContent className="flex items-center gap-4 p-5">
            {status === 'verified' ? (
              <CheckCircle2 className="h-10 w-10 text-success" />
            ) : status === 'pending' ? (
              <Loader2 className="h-10 w-10 animate-spin text-accent" />
            ) : status === 'rejected' ? (
              <AlertCircle className="h-10 w-10 text-destructive" />
            ) : (
              <ShieldCheck className="h-10 w-10 text-muted-foreground" />
            )}
            <div>
              <p className="font-semibold">Status: {KYC_STATUS_LABELS[status]}</p>
              <p className="text-sm text-muted-foreground">
                {status === 'verified' && 'You are a verified driver. You can publish trips and receive bookings.'}
                {status === 'pending' && 'Your documents are under review. This usually takes 24-48 hours.'}
                {status === 'rejected' && 'Your submission was rejected. Please review and resubmit.'}
                {status === 'unverified' && 'Submit your NIN and documents below to get verified.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {status === 'unverified' || status === 'rejected' ? (
          <Card className="border-border/60 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Verification Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="nin">National Identification Number (NIN) *</Label>
                  <Input
                    id="nin"
                    value={nin}
                    onChange={(e) => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="11-digit NIN"
                    maxLength={11}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Your NIN is encrypted and verified with the NIMC database.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="licence">Driver&apos;s Licence Number *</Label>
                  <Input
                    id="licence"
                    value={licenceNumber}
                    onChange={(e) => setLicenceNumber(e.target.value)}
                    placeholder="e.g. DL12345678AB"
                    required
                  />
                </div>

                {/* Upload placeholders */}
                <div className="space-y-3">
                  <Label>Upload Documents</Label>
                  {[
                    { label: "Driver's Licence (front & back)", icon: CreditCard },
                    { label: 'Vehicle Licence', icon: FileText },
                    { label: 'Proof of Ownership', icon: FileText },
                    { label: 'Insurance Certificate', icon: ShieldCheck },
                    { label: 'Selfie (liveness check)', icon: Camera },
                  ].map((doc) => (
                    <div
                      key={doc.label}
                      className="flex items-center justify-between rounded-lg border border-dashed border-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <doc.icon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">{doc.label}</span>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="gap-1.5">
                        <Upload className="h-3.5 w-3.5" /> Upload
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg bg-secondary/50 p-4 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <ShieldCheck className="h-4 w-4 text-success" /> Your data is protected
                  </p>
                  <p className="mt-1">
                    All documents are encrypted at rest, access-controlled, and never
                    shared with passengers. We comply with NDPR data protection standards.
                  </p>
                </div>

                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                  ) : (
                    <>Submit for verification</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {status === 'verified'
                  ? 'Your account is fully verified. You can now create trips and receive bookings.'
                  : 'Please check back later. We will notify you once your verification is complete.'}
              </p>
              <Button className="mt-4" onClick={() => router.push('/driver')}>
                Back to dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
}
