'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ticket } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { RoleId } from '@/lib/types';
import { Button, buttonVariants } from '@/components/ui/button';

export function SiteHeader() {
  const { user, loading, logout, isRole } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Ticket className="size-5" />
          <span>EventTix</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/events"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            Browse events
          </Link>

          {isRole(RoleId.Organizer) && (
            <Link
              href="/organizer/events"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              My events
            </Link>
          )}
          {isRole(RoleId.Admin) && (
            <Link
              href="/admin/users"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              Admin
            </Link>
          )}

          {loading ? null : user ? (
            <>
              <Link
                href="/my-tickets"
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                My tickets
              </Link>
              <span className="text-muted-foreground hidden text-sm sm:inline">
                {user.firstName ?? user.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                Log in
              </Link>
              <Link href="/register" className={buttonVariants({ size: 'sm' })}>
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
