'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Clock,
  Users,
  Star,
  ArrowRight,
  Snowflake,
  Car,
  ShieldCheck,
} from 'lucide-react';
import { formatNaira, formatDateTime, timeUntil } from '@/lib/constants';
import { TripWithDriver } from '@/lib/types';

export function TripCard({ trip }: { trip: TripWithDriver }) {
  const seatsLeft = trip.available_seats;
  const isFull = seatsLeft === 0;
  const isPast = new Date(trip.departure_time).getTime() < Date.now();

  return (
    <Link href={`/trip?id=${trip.id}`} className="block">
      <Card className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/40">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11">
                <AvatarImage src={trip.driver?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {trip.driver?.full_name?.[0] ?? 'D'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold leading-tight">
                  {trip.driver?.full_name ?? 'Driver'}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {trip.driver?.is_verified_driver && (
                    <Badge variant="outline" className="gap-1 border-success/30 bg-success/10 px-1.5 py-0 text-[11px] text-success">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </Badge>
                  )}
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    {trip.driver?.rating?.toFixed(1) ?? 'New'}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-display text-xl font-bold text-primary">
                {formatNaira(trip.price_per_seat)}
              </p>
              <p className="text-xs text-muted-foreground">per seat</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="flex h-2 w-2 items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <span className="text-sm font-medium">{trip.origin}</span>
            </div>
            <div className="flex flex-1 items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{trip.destination}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDateTime(trip.departure_time)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {isFull ? 'Full' : `${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left`}
            </span>
            {trip.vehicle?.has_ac && (
              <span className="flex items-center gap-1">
                <Snowflake className="h-3.5 w-3.5" /> AC
              </span>
            )}
            <span className="flex items-center gap-1">
              <Car className="h-3.5 w-3.5" />
              {trip.vehicle?.make} {trip.vehicle?.model}
            </span>
          </div>

          {!isPast && !isFull && (
            <p className="mt-3 text-xs font-medium text-primary">
              {timeUntil(trip.departure_time)}
            </p>
          )}
          {isPast && (
            <Badge variant="secondary" className="mt-3 text-xs">
              Departed
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
