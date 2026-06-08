'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { authApi, fileApi } from '@/lib/api';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  if (!user) {
    return <div className="p-8 text-center text-muted-foreground">Please log in.</div>;
  }

  return (
    <ProfileForm
      key={user.id ?? user.email}
      user={user}
      updateUser={updateUser}
    />
  );
}

function ProfileForm({
  user,
  updateUser,
}: {
  user: User;
  updateUser: (user: User) => void;
}) {
  const [form, setForm] = useState(() => ({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
  }));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      let photoData = user?.photo;
      if (avatarFile) {
        const uploadRes = await fileApi.upload(avatarFile);
        photoData = uploadRes.file;
      }
      
      const updatedUser = await authApi.updateProfile({
        ...form,
        photo: photoData,
      });
      updateUser(updatedUser);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-muted/30 p-6 rounded-lg border">
        
        <div className="flex items-center gap-6">
          <div className="shrink-0">
            <div className="size-24 rounded-full bg-muted border overflow-hidden flex items-center justify-center">
              {avatarFile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={URL.createObjectURL(avatarFile)} alt="Avatar preview" className="size-full object-cover" />
              ) : user.photo?.path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photo.path} alt="Avatar" className="size-full object-cover" />
              ) : (
                <span className="text-muted-foreground text-3xl uppercase">{form.firstName?.charAt(0) || user.email?.charAt(0) || '?'}</span>
              )}
            </div>
          </div>
          <div className="space-y-1 flex-1">
            <Label htmlFor="avatar">Profile Picture</Label>
            <Input 
              id="avatar" 
              type="file" 
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="firstName">First Name</Label>
            <Input 
              id="firstName"
              value={form.firstName}
              onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lastName">Last Name</Label>
            <Input 
              id="lastName"
              value={form.lastName}
              onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Email</Label>
          <Input value={user.email || ''} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
        </div>

        <div className="pt-4 flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
