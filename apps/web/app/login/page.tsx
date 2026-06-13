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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { GoogleLoginButton } from '@/components/google-login-button';

function redirectAfterLogin(user: { role?: { id: number } | null }, next: string | null, router: ReturnType<typeof useRouter>) {
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
}

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
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
      redirectAfterLogin(user, next, router);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Login failed. Try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>
            Welcome back. Enter your credentials to continue.
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
          <CardFooter className="mt-6 flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Logging in…' : 'Log in'}
            </Button>
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card text-muted-foreground px-2">or</span>
              </div>
            </div>
            <GoogleLoginButton
              onSuccess={async (idToken) => {
                try {
                  const user = await loginWithGoogle(idToken);
                  toast.success('Logged in');
                  const next = new URLSearchParams(window.location.search).get('next');
                  redirectAfterLogin(user, next, router);
                } catch (err) {
                  const msg = err instanceof ApiError ? err.message : 'Google login failed.';
                  toast.error(msg);
                }
              }}
              onError={() => toast.error('Google sign-in was cancelled or failed.')}
            />
            <p className="text-muted-foreground text-sm">
              No account?{' '}
              <Link href="/register" className="text-foreground underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
