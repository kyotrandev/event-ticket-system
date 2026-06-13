'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { RoleId } from '@/lib/types';
import { GoogleLoginButton } from '@/components/google-login-button';
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
  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    companyName: '',
    phoneNumber: '',
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
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        role: asOrganizer ? RoleId.Organizer : RoleId.Customer,
        ...(asOrganizer && {
          companyName: form.companyName,
          phoneNumber: form.phoneNumber,
        }),
      });

      if (asOrganizer) {
        toast.success(
          'Account created! Please check your email to verify your address. After verification, your account will be reviewed by an admin.',
          { duration: 8000 },
        );
      } else {
        toast.success(
          'Account created! Please check your email and click the verification link to activate your account.',
          { duration: 8000 },
        );
      }
      router.push('/login');
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Registration failed. Try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            Password needs 8+ characters, one uppercase letter and one number.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={asOrganizer}
                onChange={(e) => setAsOrganizer(e.target.checked)}
              />
              Register as an event organizer (requires admin approval)
            </label>

            {asOrganizer && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    required
                    value={form.companyName}
                    onChange={update('companyName')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    required
                    value={form.phoneNumber}
                    onChange={update('phoneNumber')}
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="mt-6 flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Sign up'}
            </Button>
            {!asOrganizer && (
              <>
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
                      await loginWithGoogle(idToken);
                      toast.success('Account created and logged in!');
                      router.push('/events');
                    } catch (err) {
                      const msg = err instanceof ApiError ? err.message : 'Google sign-up failed.';
                      toast.error(msg);
                    }
                  }}
                  onError={() => toast.error('Google sign-in was cancelled or failed.')}
                />
              </>
            )}
            <p className="text-muted-foreground text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-foreground underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
