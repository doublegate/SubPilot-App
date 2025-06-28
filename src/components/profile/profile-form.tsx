'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

export function ProfileForm() {
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
  });

  if (!user) {
    return <div>Loading...</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call for now
    setTimeout(() => {
      toast.success('Profile updated successfully');
      setIsLoading(false);
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center space-x-6">
        <div className="shrink-0">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user.image || ''} />
            <AvatarFallback className="text-2xl">
              {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1">
          <Label className="text-sm font-medium">Profile Picture</Label>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-sm font-medium"
            disabled={isLoading}
          >
            Change avatar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Display Name</Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={e => setFormData({ ...formData, email: e.target.value })}
          disabled={isLoading}
        />
        <p className="text-sm text-muted-foreground">
          Changing your email will require re-verification
        </p>
      </div>

      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  );
}
