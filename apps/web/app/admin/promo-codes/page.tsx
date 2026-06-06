'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { AdminLayout } from '@/components/admin-layout';
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

  // Create form state
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

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .getPromoCodes(1, 50)
      .then((res) => setCodes(res.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      setForm({ code: '', discountType: 'percent', discountValue: '', maxUses: '', validFrom: '', validTo: '' });
      setShowForm(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Create failed');
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
      } else {
        const updated = await adminApi.updatePromoCode(code.id, { isActive: true });
        setCodes((prev) => prev.map((c) => (c.id === code.id ? updated : c)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActioning(null);
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Promo Codes</h1>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ New Code'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Create Promo Code</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleCreate(e)} className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  required
                  placeholder="SUMMER20"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
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
                  value={form.validTo}
                  onChange={(e) => setForm((f) => ({ ...f, validTo: e.target.value }))}
                />
              </div>

              {formError && (
                <div className="sm:col-span-3 rounded-lg bg-destructive/10 text-destructive p-2 text-sm">
                  {formError}
                </div>
              )}

              <div className="sm:col-span-3">
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm mb-4">
          {error}
        </div>
      )}

      {loading && <p className="text-muted-foreground">Loading…</p>}

      {!loading && codes.length === 0 && (
        <p className="text-muted-foreground">No promo codes yet.</p>
      )}

      {codes.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Discount</th>
                <th className="px-3 py-2 text-left">Uses</th>
                <th className="px-3 py-2 text-left">Valid</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {codes.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono font-medium">{c.code}</td>
                  <td className="px-3 py-2">
                    {c.discountType === 'percent'
                      ? `${c.discountValue}%`
                      : `${c.discountValue.toLocaleString()} VND`}
                  </td>
                  <td className="px-3 py-2">
                    {c.usedCount} / {c.maxUses}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {fmtDate(c.validFrom)} — {fmtDate(c.validTo)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={c.isActive ? 'default' : 'secondary'}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant={c.isActive ? 'destructive' : 'outline'}
                      disabled={actioning === c.id}
                      onClick={() => void toggleActive(c)}
                    >
                      {actioning === c.id ? '…' : c.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
