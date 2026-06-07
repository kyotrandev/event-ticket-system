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
      <div className="flex min-h-screen items-center justify-center">
        <span className="font-semibold text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-2 bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={buttonVariants({
                variant: pathname === n.href ? 'secondary' : 'ghost',
                size: 'sm',
              })}
              aria-current={pathname === n.href ? 'page' : undefined}
            >
              {n.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="page-shell">{children}</div>
    </div>
  );
}
