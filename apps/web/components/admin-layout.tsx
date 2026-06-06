'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { RoleId } from '@/lib/types';
import { buttonVariants } from '@/components/ui/button';

const NAV = [
  { href: '/admin/stats', label: 'Stats' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/organizers/pending', label: 'Pending Organizers' },
  { href: '/admin/promo-codes', label: 'Promo Codes' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role?.id !== RoleId.Admin)) {
      router.replace('/');
    }
  }, [loading, user, router]);

  if (loading || !user || user.role?.id !== RoleId.Admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 flex gap-1 py-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={buttonVariants({
                variant: pathname === n.href ? 'default' : 'ghost',
                size: 'sm',
              })}
            >
              {n.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
