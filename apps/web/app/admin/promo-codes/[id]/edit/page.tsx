'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { AdminLayout } from '@/components/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PromoCode } from '@/lib/types';

export default function EditPromoCodePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    maxUses: 0,
    isActive: true,
  });

  const [codeName, setCodeName] = useState('');

  useEffect(() => {
    if (id) {
      adminApi.getPromoCodes(1, 1000) // Fetch all to find the one
        .then(res => {
          const code = res.data.find(c => c.id === id);
          if (code) {
            setCodeName(code.code);
            setForm({
              maxUses: code.maxUses,
              isActive: code.isActive,
            });
          } else {
            setError('Promo code not found');
          }
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : 'Failed to fetch promo code');
        })
        .finally(() => {
          setFetching(false);
        });
    }
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = {
        maxUses: Number(form.maxUses),
        isActive: form.isActive,
      };
      await adminApi.updatePromoCode(id, data);
      router.push('/admin/promo-codes');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update promo code');
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return <AdminLayout><div className="p-8 text-center text-muted-foreground">Loading...</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/promo-codes" className="text-sm text-muted-foreground hover:underline">
          &larr; Back
        </Link>
        <h1 className="text-2xl font-bold">Edit Promo Code</h1>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Code: {codeName}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="maxUses">Max Uses</Label>
              <Input
                id="maxUses"
                type="number"
                required
                min={1}
                value={form.maxUses}
                onChange={(e) => setForm((f) => ({ ...f, maxUses: Number(e.target.value) }))}
              />
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <Button type="submit" disabled={loading} className="mt-4">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
