'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hash = searchParams.get('hash');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(() => {
    return hash ? 'loading' : 'error';
  });
  const [errorMsg, setErrorMsg] = useState<string>(() => {
    return hash ? '' : 'Invalid verification link. No hash parameter found.';
  });

  useEffect(() => {
    if (!hash) {
      return;
    }

    api
      .post('/auth/email/confirm', { hash }, false)
      .then(() => {
        setStatus('success');
      })
      .catch((err: unknown) => {
        setStatus('error');
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Verification failed. The link may have expired.',
        );
      });
  }, [hash]);

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>
            {status === 'loading' && 'Verifying your email…'}
            {status === 'success' && '✅ Email verified!'}
            {status === 'error' && '❌ Verification failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' &&
              'Please wait while we confirm your email address.'}
            {status === 'success' &&
              'Your email has been confirmed. You can now log in to your account.'}
            {status === 'error' && errorMsg}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'loading' && (
            <div className="flex justify-center py-8">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
          )}
        </CardContent>
        <CardFooter>
          {status === 'success' && (
            <Button className="w-full" onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          )}
          {status === 'error' && (
            <Link href="/register" className="w-full">
              <Button variant="outline" className="w-full">
                Back to Register
              </Button>
            </Link>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      }
    >
      <ConfirmEmailContent />
    </Suspense>
  );
}
