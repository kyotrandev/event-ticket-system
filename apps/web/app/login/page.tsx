'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { RoleId } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Ticket } from 'lucide-react';

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
      if (next) {
        router.push(next);
      } else if (user.role?.id === RoleId.Organizer) {
        router.push('/organizer/events');
      } else if (user.role?.id === RoleId.Admin) {
        router.push('/admin/dashboard');
      } else if (user.role?.id === RoleId.Staff) {
        router.push('/staff/dashboard');
      } else {
        router.push('/events');
      }
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Login failed. Try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-2">
      {/* Left side: Form */}
      <div className="flex flex-col justify-center px-8 py-12 sm:px-16 lg:px-24 xl:px-32">
        <div className="mx-auto w-full max-w-sm space-y-8">
          <div className="flex items-center gap-2">
             <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                <Ticket className="size-5 text-primary-foreground" />
             </div>
             <span className="text-xl font-bold tracking-tight">EventTicket</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground text-sm">
              Log in to your account to manage your tickets and events.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            <Button type="submit" className="h-11 w-full" disabled={submitting}>
              {submitting ? 'Logging in…' : 'Log in'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Right side: Image/Pattern */}
      <div className="hidden bg-zinc-950 lg:block relative overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1540039155733-d7696c981b6c?auto=format&fit=crop&q=80&w=2000" 
          alt="Concert crowd" 
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-zinc-50">
          <blockquote className="space-y-4">
            <p className="text-2xl font-medium leading-relaxed">
              &ldquo;The easiest way to discover, book, and manage your live experiences. EventTicket completely changed how we connect with our audience.&rdquo;
            </p>
            <footer className="text-sm text-zinc-400">
              Sofia Davis, Organizer
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
