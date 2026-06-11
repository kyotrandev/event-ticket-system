'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Receipt, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/my-bookings', label: 'My Bookings', icon: Receipt },
  { href: '/my-tickets', label: 'My Tickets', icon: Ticket },
] as const;

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background">
      <div className="border-b-2 border-border bg-background/80 backdrop-blur-sm sticky top-20 z-40">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            My account
          </p>
          <nav className="flex gap-2">
            {TABS.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all border-2',
                    active
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
