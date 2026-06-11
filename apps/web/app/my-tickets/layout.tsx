'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { RoleId } from '@/lib/types';
import { AccountShell } from '@/components/customer/account-shell';

export default function MyTicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role?.id === RoleId.Staff) {
      router.replace('/staff/dashboard');
      return;
    }
    if (user.role?.id === RoleId.Organizer) {
      router.replace('/organizer/tickets');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <span className="text-muted-foreground text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (user.role?.id === RoleId.Staff || user.role?.id === RoleId.Organizer) {
    return null;
  }

  return <AccountShell>{children}</AccountShell>;
}
