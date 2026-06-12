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
import { Building2 } from 'lucide-react';

export default function OrganizerRegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    companyName: '',
    phoneNumber: '',
  });
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
        companyName: form.companyName,
        phoneNumber: form.phoneNumber,
        role: RoleId.Organizer,
      });

      toast.success(
        'Application submitted! Please check your email to verify your address. After verification, your account will be reviewed by our team.',
        { duration: 8000 },
      );
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
    <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-2">
      {/* Left side: Form */}
      <div className="flex flex-col justify-center px-8 py-12 sm:px-16 lg:px-24 xl:px-32">
        <div className="mx-auto w-full max-w-sm space-y-8">
          <div className="flex items-center gap-2">
             <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                <Building2 className="size-5 text-primary-foreground" />
             </div>
             <span className="text-xl font-bold tracking-tight">EventTicket For Organizers</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Apply as an Organizer</h1>
            <p className="text-muted-foreground text-sm">
              Create an account to host events, manage attendees, and track your revenue.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    required
                    value={form.firstName}
                    onChange={update('firstName')}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    required
                    value={form.lastName}
                    onChange={update('lastName')}
                    className="h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Work email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={update('email')}
                  className="h-11"
                  placeholder="name@company.com"
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
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                 <div className="space-y-2">
                    <Label htmlFor="companyName">Company name</Label>
                    <Input
                       id="companyName"
                       required
                       value={form.companyName}
                       onChange={update('companyName')}
                       className="h-11"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone number</Label>
                    <Input
                       id="phoneNumber"
                       required
                       value={form.phoneNumber}
                       onChange={update('phoneNumber')}
                       className="h-11"
                    />
                 </div>
              </div>
            </div>

            <Button type="submit" className="h-11 w-full" disabled={submitting}>
              {submitting ? 'Submitting application…' : 'Submit application'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Looking to buy tickets instead?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Create a customer account
            </Link>
          </p>
        </div>
      </div>

      {/* Right side: Image/Pattern */}
      <div className="hidden bg-zinc-950 lg:block relative overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=2000" 
          alt="Event backstage" 
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-zinc-50">
          <blockquote className="space-y-4">
            <p className="text-2xl font-medium leading-relaxed">
              &ldquo;The tools EventTicket provides organizers are simply unmatched. We grew our ticket sales by 40% in the first quarter of using the platform.&rdquo;
            </p>
            <footer className="text-sm text-zinc-400">
              Michael Chang, Festival Director
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
