'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Message = { role: 'user' | 'bot'; text: string };

const quickReplies = [
  'How do I book a trip?',
  'How do I become a driver?',
  'How do I pay for a trip?',
  'Is my payment secure?',
];

function botReply(input: string): string {
  const q = input.toLowerCase();
  if (q.includes('book') || q.includes('reserve')) {
    return "To book a trip: go to 'Find Trips', enter your departure and destination cities, then browse available trips. Click a trip, select your seats, and pay securely via Paystack. You'll get an instant booking confirmation.";
  }
  if (q.includes('driver') || q.includes('earn') || q.includes('become')) {
    return "To become a driver: sign up with the 'driver' role, complete NIN verification and vehicle inspection on your driver dashboard. Once approved by our admin team, you can publish trips and start earning.";
  }
  if (q.includes('pay') || q.includes('payment') || q.includes('paystack')) {
    return "We accept card payments, bank transfers, and USSD via Paystack. Your money is held securely until the trip is confirmed. No cash needed.";
  }
  if (q.includes('secure') || q.includes('safe') || q.includes('trust')) {
    return "Every driver passes NIN verification and KYC checks. Payments are encrypted and processed by Paystack. We also have a two-way rating system to keep the community safe.";
  }
  if (q.includes('cancel') || q.includes('refund')) {
    return "You can cancel a booking from your dashboard. Refunds are processed back to your original payment method within 3-5 business days, depending on your bank.";
  }
  if (q.includes('verify') || q.includes('nin') || q.includes('kyc')) {
    return "Driver verification requires a valid NIN, a vehicle inspection, and KYC documents. Submit these on your driver dashboard under 'Verification'. Our admin team reviews within 24-48 hours.";
  }
  if (q.includes('hi') || q.includes('hello') || q.includes('hey')) {
    return "Hello! I'm NaijaRide's virtual assistant. Ask me about booking trips, becoming a driver, payments, or safety. How can I help?";
  }
  return "I'm here to help with booking trips, driver verification, payments, and safety questions. Could you tell me a bit more about what you need? You can also email hello@naijaride.ng for complex issues.";
}

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: "Hi! I'm the NaijaRide virtual assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'bot', text: botReply(text) }]);
    }, 500);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        aria-label="Open chat support"
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">NaijaRide Assistant</p>
              <p className="text-xs opacity-80">Online · typically replies instantly</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn('flex gap-2', m.role === 'user' && 'flex-row-reverse')}
              >
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    m.role === 'bot' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {m.role === 'bot' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                    m.role === 'bot'
                      ? 'rounded-tl-sm bg-secondary text-secondary-foreground'
                      : 'rounded-tr-sm bg-primary text-primary-foreground'
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Quick replies */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {quickReplies.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-border p-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(input)}
              placeholder="Type your message..."
              className="h-10"
            />
            <Button size="icon" className="h-10 w-10 shrink-0" onClick={() => send(input)}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
