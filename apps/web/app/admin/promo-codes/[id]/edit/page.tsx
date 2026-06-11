'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    if (!id) return;
    adminApi
      .getPromoCode(id)
      .then((code) => {
        setCodeName(code.code);
        setForm({
          maxUses: code.maxUses,
          isActive: code.isActive,
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to fetch promo code');
      })
      .finally(() => {
        setFetching(false);
      });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminApi.updatePromoCode(id, {
        maxUses: Number(form.maxUses),
        isActive: form.isActive,
      });
      toast.success('Promo code updated');
      router.push('/admin/promo-codes');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update promo code';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return <div className="text-center text-muted-foreground py-12">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/promo-codes"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">Edit Promo Code</h1>
      </div>

      <Card className="max-w-xl rounded-3xl border-2">
        <CardHeader>
          <CardTitle className="font-bold">Code: {codeName}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-xl bg-destructive/10 text-destructive p-3 text-sm mb-4">
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
                className="rounded-xl"
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

            <Button type="submit" disabled={loading} className="mt-4 rounded-2xl">
              {loading ? 'Saving…' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
