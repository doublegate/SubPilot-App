'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/trpc/react';
import { toast } from 'sonner';

interface ProfileFormProps {
  user: {
    id: string;
    name?: string | null;
    email: string;
    image?: string | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name ?? '',
    email: user.email,
  });

  const updateProfileMutation = api.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success('Profile updated successfully');
      router.refresh();
    },
    onError: error => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateProfileMutation.mutateAsync({
        name: formData.name.trim() || undefined,
        email: formData.email !== user.email ? formData.email : undefined,
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center space-x-6">
        <div className="shrink-0">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-2xl font-bold text-white">
            {user.name?.[0]?.toUpperCase() ?? user.email[0]?.toUpperCase()}
          </div>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Profile Picture
          </label>
          <button
            type="button"
            className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
            disabled={isLoading}
          >
            Change avatar
          </button>
        </div>
      </div>

      <div>
        <label
          htmlFor="name"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Display Name
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
          disabled={isLoading}
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={e => setFormData({ ...formData, email: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
          disabled={isLoading}
        />
        <p className="mt-1 text-sm text-gray-500">
          Changing your email will require re-verification
        </p>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md border border-transparent bg-gradient-to-r from-cyan-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-cyan-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
