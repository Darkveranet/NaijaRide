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
import { uploadFile } from '@/lib/storage';
import { useAuth } from '@/components/providers/auth-provider';
import { KYC_STATUS_LABELS } from '@/lib/constants';
import {
  ShieldCheck, CreditCard, Camera, Loader2, CheckCircle2, AlertCircle,
  FileText, Upload, Lock,
} from 'lucide-react';

type DocType = 'drivers_licence' | 'vehicle_licence' | 'proof_of_ownership' | 'insurance' | 'gov_id' | 'selfie';
const DOCS: { type: DocType; label: string; icon: any }[] = [
  { type: 'drivers_licence', label: "Driver's Licence", icon: CreditCard },
  { type: 'vehicle_licence', label: 'Vehicle Licence', icon: FileText },
  { type: 'proof_of_ownership', label: 'Proof of Ownership', icon: FileText },
  { type: 'insurance', label: 'Insurance Certificate', icon: ShieldCheck },
  { type: 'gov_id', label: 'Government ID', icon: CreditCard },
  { type: 'selfie', label: 'Selfie (liveness)', icon: Camera },
];

export default function VerificationPage() {
  const router = useRouter();
  const { user, profile, refreshProfile, loading } = useAuth();
  const [nin, setNin] = useState('');
  const [licence, setLicence] = useState('');
  const [uploaded, setUploaded] = useState<Record<string, string>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [loading, user, router]);

  const handleUpload = async (type: DocType, file?: File) => {
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) { toast.error('File too large (max 6MB)'); return; }
    setUploadingKey(type);
    try {
      const { path } = await uploadFile('kyc-documents', file, { prefix: type });
      // record in documents table
      await supabase.from('documents').insert({ user_id: user!.id, type, path, mime_type: file.type });
      setUploaded((u) => ({ ...u, [type]: path }));
      toast.success(`${type.replace(/_/g, ' ')} uploaded`);
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nin.length !== 11) { toast.error('NIN must be 11 digits'); return; }
    if (!licence) { toast.error("Driver's licence number is required"); return; }
    setSubmitting(true);
    // encrypted NIN + duplicate detection (server-side)
    const { data, error } = await supabase.rpc('submit_kyc', { p_nin: nin, p_provider_ref: null });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    const r = data as { error?: string; status?: string };
    if (r?.error) { toast.error(r.error); return; }
    await refreshProfile();
    toast.success('Verification submitted! We\u2019ll review within 48 hours.');
    router.push('/driver');
  };

  if (loading) return <div className="min-h-screen"><Navbar /></div>;
  const status = profile?.kyc_status ?? 'unverified';
  const canSubmit = status === 'unverified' || status === 'rejected';

  return (
    <div className="min-h-screen"><Navbar />
      <div className="container max-w-2xl py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Driver Verification</h1>
          <p className="text-sm text-muted-foreground">Complete KYC to earn the Verified Driver badge and publish trips.</p>
        </div>

        {/* Status banner */}
        <Card className="mb-6">
          <CardContent className="flex items-center gap-3 p-5">
            {status === 'verified' ? <CheckCircle2 className="h-6 w-6 text-success" />
              : status === 'pending' ? <Loader2 className="h-6 w-6 animate-spin text-accent" />
              : status === 'rejected' ? <AlertCircle className="h-6 w-6 text-destructive" />
              : <ShieldCheck className="h-6 w-6 text-muted-foreground" />}
            <div>
              <p className="font-semibold">Status: {KYC_STATUS_LABELS[status]}</p>
              <p className="text-sm text-muted-foreground">
                {status === 'verified' && 'You are verified — you can publish trips and receive bookings.'}
                {status === 'pending' && 'Your documents are under review. This usually takes 24–48 hours.'}
                {status === 'rejected' && 'Your submission was rejected. Please review and resubmit.'}
                {status === 'unverified' && 'Submit your NIN and documents below to get verified.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {canSubmit ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Identity</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>National Identification Number (NIN) *</Label>
                  <Input value={nin} onChange={(e) => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="11-digit NIN" maxLength={11} required />
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Your NIN is encrypted at rest and checked for duplicates. It is never shared with passengers.</p>
                </div>
                <div className="space-y-2">
                  <Label>Driver&apos;s Licence Number *</Label>
                  <Input value={licence} onChange={(e) => setLicence(e.target.value)} placeholder="e.g. DL12345678AB" required />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Documents</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {DOCS.map((doc) => (
                  <div key={doc.type} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                    <div className="flex items-center gap-3">
                      <doc.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">{doc.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {uploaded[doc.type] && <Badge className="bg-success/10 text-success gap-1"><CheckCircle2 className="h-3 w-3" /> Uploaded</Badge>}
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*,application/pdf" className="hidden"
                          onChange={(e) => handleUpload(doc.type, e.target.files?.[0])} disabled={uploadingKey === doc.type} />
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent">
                          {uploadingKey === doc.type ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          {uploaded[doc.type] ? 'Replace' : 'Upload'}
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="flex items-center gap-1 text-xs font-medium"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Your data is protected</p>
                  <p className="mt-1 text-xs text-muted-foreground">Documents are stored privately, access-controlled, and never shared with passengers. We comply with NDPR standards.</p>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : <>Submit for verification</>}
            </Button>
          </form>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <ShieldCheck className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 max-w-sm text-sm text-muted-foreground">
                {status === 'verified' ? 'Your account is fully verified. You can now create trips and receive bookings.' : 'Please check back later — we will notify you once your verification is complete.'}
              </p>
              <Button className="mt-4" onClick={() => router.push('/driver')}>Back to dashboard</Button>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
}
