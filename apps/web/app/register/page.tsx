'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, UserPlus } from 'lucide-react';
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

export default function RegisterPage() {
  const { register, login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [asOrganizer, setAsOrganizer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register({
        ...form,
        role: asOrganizer ? RoleId.Organizer : RoleId.Customer,
      });

      if (asOrganizer) {
        toast.success('Account created - pending admin approval before login.');
        router.push('/login');
        return;
      }

      await login(form.email, form.password);
      toast.success('Welcome to EventTix!');
      router.push('/events');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Registration failed. Try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell grid min-h-[calc(100vh-4.75rem)] items-center gap-8 lg:grid-cols-[1fr_1fr]">
      <section className="space-y-5">
        <p className="vibrant-chip inline-flex">New pass</p>
        <h1 className="display-play text-6xl leading-[0.9] sm:text-7xl">
          Make your account pop.
        </h1>
        <p className="max-w-xl text-base font-semibold leading-7 text-muted-foreground">
          Customer accounts activate immediately. Organizer accounts land in
          the admin approval queue first.
        </p>
        <div className="vibrant-card p-5">
          <Building2 className="mb-6 size-7 text-primary" />
          <h2 className="text-2xl font-black">Organizer approval is testable</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
            Register as organizer, then approve it from Admin / Pending
            Organizers using the seeded admin account.
          </p>
        </div>
      </section>

      <Card className="mx-auto w-full max-w-lg">
        <CardHeader>
          <div className="mb-3 flex size-12 items-center justify-center rounded-lg border-2 border-foreground bg-secondary text-secondary-foreground shadow-[4px_4px_0_var(--primary)]">
            <UserPlus className="size-5" />
          </div>
          <CardTitle>Create account</CardTitle>
          <CardDescription>
            Password needs 8+ characters, one uppercase letter, and one number.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  required
                  value={form.firstName}
                  onChange={update('firstName')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  required
                  value={form.lastName}
                  onChange={update('lastName')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={update('email')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={form.password}
                onChange={update('password')}
              />
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border-2 bg-card px-3 text-sm font-black transition-colors hover:bg-accent">
              <input
                type="checkbox"
                className="size-5 accent-[var(--primary)]"
                checked={asOrganizer}
                onChange={(e) => setAsOrganizer(e.target.checked)}
              />
              Register as an event organizer
            </label>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Sign up'}
            </Button>
            <p className="text-sm font-semibold text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-black text-foreground underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
