'use client';

import { useSyncExternalStore } from 'react';
import { Clock } from 'lucide-react';

let currentNow = Date.now();

function subscribe(cb: () => void) {
  currentNow = Date.now();
  const id = setInterval(() => {
    currentNow = Date.now();
    cb();
  }, 1000);
  return () => clearInterval(id);
}

function getSnapshot() {
  return currentNow;
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function BookingCountdown({ expiresAt }: { expiresAt: string }) {
  const now = useSyncExternalStore(subscribe, getSnapshot, () => 0);
  const seconds = Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - now) / 1000),
  );

  if (seconds <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-destructive text-sm font-semibold">
        <Clock className="size-4" />
        Hold expired
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-sm font-semibold">
      <Clock className="size-4" />
      Pay within {formatCountdown(seconds)}
    </span>
  );
}
