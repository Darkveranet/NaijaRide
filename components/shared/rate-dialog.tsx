'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

// Reusable star-rating dialog. Calls submit_review() which recomputes the
// reviewee's average rating server-side.
export function RateDialog({
  tripId, revieweeId, revieweeName, trigger, onDone,
}: {
  tripId: string; revieweeId: string; revieweeName?: string;
  trigger: React.ReactNode; onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (rating < 1) { toast.error('Pick a star rating'); return; }
    setBusy(true);
    const { error } = await supabase.rpc('submit_review', {
      p_trip_id: tripId, p_reviewee: revieweeId, p_rating: rating, p_comment: comment || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Thanks for your rating!');
    setOpen(false); setRating(0); setComment('');
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Rate {revieweeName || 'your trip'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}>
                <Star className={`h-8 w-8 transition ${n <= (hover || rating) ? 'fill-warning text-warning' : 'text-muted'}`} />
              </button>
            ))}
          </div>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment (optional)" rows={3} />
          <Button className="w-full gap-2" onClick={submit} disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : 'Submit rating'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
