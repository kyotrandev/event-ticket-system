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
    <header className="border-b-2 border-border bg-background sticky top-0 z-50">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3 font-semibold group">
          <div className="bg-primary p-2.5 rounded-2xl border-b-[4px] border-primary/80 group-hover:-translate-y-1 group-active:translate-y-1 group-active:border-b-0 transition-all">
            <Ticket className="size-6 text-primary-foreground" strokeWidth={3} />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-foreground">event<span className="text-primary">tix</span></span>
        </Link>

        <nav className="flex items-center gap-2 md:gap-4">
          {!isRole(RoleId.Staff) && (
            <Link
              href="/events"
              className={buttonVariants({ variant: 'ghost', size: 'lg', className: 'font-bold rounded-2xl text-base' })}
            >
              Browse
            </Link>
          )}

          {isRole(RoleId.Organizer) && (
            <Link
              href="/organizer/events"
              className={buttonVariants({ variant: 'ghost', size: 'lg', className: 'font-bold rounded-2xl text-base hidden md:inline-flex' })}
            >
              My Events
            </Link>
          )}
          {isRole(RoleId.Admin) && (
            <Link
              href="/admin/users"
              className={buttonVariants({ variant: 'ghost', size: 'lg', className: 'font-bold rounded-2xl text-base hidden md:inline-flex' })}
            >
              Admin
            </Link>
          )}
          {isRole(RoleId.Staff) && (
            <Link
              href="/staff/dashboard"
              className={buttonVariants({ variant: 'ghost', size: 'lg', className: 'font-bold rounded-2xl text-base hidden md:inline-flex' })}
            >
              Dashboard
            </Link>
          )}

          {loading ? null : user ? (
            <>
              {!isRole(RoleId.Staff) && (
                <Link
                  href="/my-tickets"
                  className={buttonVariants({ variant: 'ghost', size: 'lg', className: 'font-bold rounded-2xl text-base hidden sm:inline-flex' })}
                >
                  My tickets
                </Link>
              )}
              <span className="text-muted-foreground hidden text-sm font-medium sm:inline px-2">
                {user.firstName ?? user.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout} className="font-bold rounded-2xl ml-2">
                Log out
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-3 ml-2">
              <Link
                href="/login"
                className={buttonVariants({ variant: 'ghost', size: 'lg', className: 'font-bold rounded-2xl text-base' })}
              >
                Log in
              </Link>
              <Link href="/register" className={buttonVariants({ size: 'lg', className: 'font-bold rounded-2xl text-base' })}>
                Get Started
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
