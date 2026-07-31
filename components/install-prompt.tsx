'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onBIP = (e: any) => { e.preventDefault(); setDeferred(e); setShow(true); };
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', () => setShow(false));
    return () => window.removeEventListener('beforeinstallprompt', onBIP);
  }, []);
  if (!show) return null;
  return (
    <Button
      onClick={async () => { deferred?.prompt(); await deferred?.userChoice; setShow(false); }}
      className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 gap-2 rounded-full shadow-lg"
    >
      <Download className="h-4 w-4" /> Install NaijaRide
    </Button>
  );
}
