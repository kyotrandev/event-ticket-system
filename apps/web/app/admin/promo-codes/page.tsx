'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PromoCode } from '@/lib/types';

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString();
}

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: '',
    discountType: 'percent' as 'percent' | 'fixed',
    discountValue: '',
    maxUses: '',
    validFrom: '',
    validTo: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getPromoCodes(1, 50)
      .then((res) => setCodes(res.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      const created = await adminApi.createPromoCode({
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxUses: Number(form.maxUses),
        validFrom: new Date(form.validFrom).toISOString(),
        validTo: new Date(form.validTo).toISOString(),
        isActive: true,
      });
      setCodes((prev) => [created, ...prev]);
      setForm({
        code: '',
        discountType: 'percent',
        discountValue: '',
        maxUses: '',
        validFrom: '',
        validTo: '',
      });
      setShowForm(false);
      toast.success(`Promo code ${created.code} created`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Create failed';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(code: PromoCode) {
    setActioning(code.id);
    setError(null);
    try {
      if (code.isActive) {
        await adminApi.deletePromoCode(code.id);
        setCodes((prev) => prev.map((c) => (c.id === code.id ? { ...c, isActive: false } : c)));
        toast.success(`${code.code} deactivated`);
      } else {
        const updated = await adminApi.updatePromoCode(code.id, { isActive: true });
        setCodes((prev) => prev.map((c) => (c.id === code.id ? updated : c)));
        toast.success(`${code.code} activated`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Action failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setActioning(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this promo code?')) return;
    setActioning(id);
    setError(null);
    try {
      await adminApi.deletePromoCode(id);
      setCodes((prev) => prev.filter((c) => c.id !== id));
      toast.success('Promo code deleted');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setActioning(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Promo Codes</h1>
          <p className="text-muted-foreground mt-1">Create and manage discount codes.</p>
        </div>
        <Button size="sm" className="rounded-2xl" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ New Code'}
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-3xl border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Create Promo Code</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleCreate(e)} className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  required
                  placeholder="SUMMER20"
                  className="rounded-xl"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={form.discountType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      discountType: e.target.value as 'percent' | 'fixed',
                    }))
                  }
                >
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed (VND)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="val">
                  Value {form.discountType === 'percent' ? '(0–100)' : '(VND)'}
                </Label>
                <Input
                  id="val"
                  type="number"
                  required
                  min={1}
                  max={form.discountType === 'percent' ? 100 : undefined}
                  className="rounded-xl"
                  value={form.discountValue}
                  onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="max">Max Uses</Label>
                <Input
                  id="max"
                  type="number"
                  required
                  min={1}
                  className="rounded-xl"
                  value={form.maxUses}
                  onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="from">Valid From</Label>
                <Input
                  id="from"
                  type="datetime-local"
                  required
                  className="rounded-xl"
                  value={form.validFrom}
                  onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="to">Valid To</Label>
                <Input
                  id="to"
                  type="datetime-local"
                  required
                  className="rounded-xl"
                  value={form.validTo}
                  onChange={(e) => setForm((f) => ({ ...f, validTo: e.target.value }))}
                />
              </div>

              {formError && (
                <div className="sm:col-span-3 rounded-xl bg-destructive/10 text-destructive p-2 text-sm">
                  {formError}
                </div>
              )}

              <div className="sm:col-span-3">
                <Button type="submit" disabled={creating} className="rounded-2xl">
                  {creating ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-2xl bg-destructive/10 text-destructive p-3 text-sm">{error}</div>
      )}

      {loading && <p className="text-muted-foreground">Loading…</p>}

      {!loading && codes.length === 0 && (
        <p className="text-muted-foreground">No promo codes yet.</p>
      )}

      {codes.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border-2">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Code</th>
                <th className="px-4 py-3 text-left font-semibold">Discount</th>
                <th className="px-4 py-3 text-left font-semibold">Uses</th>
                <th className="px-4 py-3 text-left font-semibold">Valid</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {codes.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono font-medium">{c.code}</td>
                  <td className="px-4 py-3">
                    {c.discountType === 'percent'
                      ? `${c.discountValue}%`
                      : `${c.discountValue.toLocaleString()} VND`}
                  </td>
                  <td className="px-4 py-3">
                    {c.usedCount} / {c.maxUses}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {fmtDate(c.validFrom)} — {fmtDate(c.validTo)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={c.isActive ? 'default' : 'secondary'}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={c.isActive ? 'secondary' : 'outline'}
                        className="rounded-xl"
                        disabled={actioning === c.id}
                        onClick={() => void toggleActive(c)}
                      >
                        {actioning === c.id ? '…' : c.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Link
                        href={`/admin/promo-codes/${c.id}/edit`}
                        className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3"
                      >
                        Edit
                      </Link>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-xl"
                        disabled={actioning === c.id}
                        onClick={() => void handleDelete(c.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
