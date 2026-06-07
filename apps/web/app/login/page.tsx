'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { RoleId } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const seededAccounts = [
  'admin@example.com',
  'john.doe@example.com',
  'organizer@example.com',
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await login(email, password);
      toast.success('Logged in');
      const next = new URLSearchParams(window.location.search).get('next');
      if (next) router.push(next);
      else if (user.role?.id === RoleId.Organizer) router.push('/organizer/events');
      else if (user.role?.id === RoleId.Admin) router.push('/admin/users');
      else router.push('/events');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Login failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell grid min-h-[calc(100vh-4.75rem)] items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="space-y-5">
        <p className="vibrant-chip inline-flex">Seeded playground</p>
        <h1 className="display-play text-6xl leading-[0.9] sm:text-7xl">
          Jump back into the fun.
        </h1>
        <p className="max-w-xl text-base font-semibold leading-7 text-muted-foreground">
          Use one of the ready-made accounts to test customer, organizer, and
          admin flows quickly.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {seededAccounts.map((account) => (
            <button
              key={account}
              type="button"
              className="vibrant-card p-3 text-left font-mono text-xs transition-transform hover:-translate-x-1 hover:-translate-y-1"
              onClick={() => {
                setEmail(account);
                setPassword('secret');
              }}
            >
              {account}
              <span className="mt-2 block font-sans font-black text-muted-foreground">
                secret
              </span>
            </button>
          ))}
        </div>
      </section>

      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-12 items-center justify-center rounded-lg border-2 border-foreground bg-accent text-accent-foreground shadow-[4px_4px_0_var(--primary)]">
            <KeyRound className="size-5" />
          </div>
          <CardTitle>Log in</CardTitle>
          <CardDescription>
            Enter credentials to continue into the right dashboard.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Logging in...' : 'Log in'}
            </Button>
            <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <PartyPopper className="size-4 text-primary" />
              No account?{' '}
              <Link href="/register" className="font-black text-foreground underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
