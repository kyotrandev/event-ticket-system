'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Moon, Sparkles, Sun, Ticket } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { RoleId } from '@/lib/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ets.theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const nextDark = saved ? saved === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', nextDark);
    setDark(nextDark);
  }, []);

  function toggleTheme() {
    const nextDark = !dark;
    document.documentElement.classList.toggle('dark', nextDark);
    localStorage.setItem('ets.theme', nextDark ? 'dark' : 'light');
    setDark(nextDark);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: active ? 'secondary' : 'ghost', size: 'sm' }),
        'hidden sm:inline-flex',
      )}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}

export function SiteHeader() {
  const { user, loading, logout, isRole } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-40 border-b-2 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[4.75rem] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="relative flex size-11 shrink-0 items-center justify-center rounded-lg border-2 border-foreground bg-secondary text-secondary-foreground shadow-[4px_4px_0_var(--primary)]">
            <Ticket className="size-5" />
            <Sparkles className="absolute -right-2 -top-2 size-4 fill-accent text-accent-foreground" />
          </span>
          <span className="truncate font-heading text-3xl leading-none max-[480px]:hidden">
            EventTix
          </span>
        </Link>

        <nav className="flex min-w-0 items-center justify-end gap-2">
          <NavLink href="/events">Browse</NavLink>
          {isRole(RoleId.Organizer) && <NavLink href="/organizer/events">Events</NavLink>}
          {isRole(RoleId.Admin) && <NavLink href="/admin/users">Admin</NavLink>}

          {loading ? null : user ? (
            <>
              <NavLink href="/my-bookings">Bookings</NavLink>
              <NavLink href="/my-tickets">Tickets</NavLink>
              <span className="hidden max-w-24 truncate text-sm font-black text-muted-foreground md:inline">
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
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
