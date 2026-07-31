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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { KYC_STATUS_LABELS } from '@/lib/constants';
import { ShieldCheck, Star, Loader2, Save, User } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone ?? '');
    }
  }, [user, profile, loading, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone })
      .eq('id', user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success('Profile updated');
  };

  if (loading) return <div className="min-h-screen"><Navbar /></div>;

  const initials = (profile?.full_name || user?.email || '?')
    .split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-2xl py-8">
        <h1 className="mb-8 font-display text-2xl font-bold sm:text-3xl">My Profile</h1>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-display text-lg font-semibold">{profile?.full_name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize">{profile?.role}</Badge>
                  {profile?.is_verified_driver && (
                    <Badge className="gap-1 bg-success/10 text-success">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </Badge>
                  )}
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    {profile?.rating?.toFixed(1) ?? 'New'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Edit Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0800 000 0000" />
              </div>
              <Button type="submit" className="gap-2" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {profile?.role === 'driver' && (
          <Card className="mb-6">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Verification Status</p>
                  <p className="text-sm text-muted-foreground">
                    {KYC_STATUS_LABELS[profile.kyc_status]}
                  </p>
                </div>
                {profile.kyc_status !== 'verified' && (
                  <Button variant="outline" onClick={() => router.push('/driver/verification')}>
                    {profile.kyc_status === 'unverified' ? 'Verify now' : 'Check status'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive"
          onClick={async () => { await signOut(); router.push('/'); }}
        >
          Sign out
        </Button>
      </div>
      <Footer />
    </div>
  );
}
