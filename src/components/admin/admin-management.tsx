'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  createdAt: Date;
  image: string | null;
}

interface UserSearchResult {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  image: string | null;
}
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Crown,
  UserPlus,
  UserMinus,
  Search,
  Shield,
  Users,
} from 'lucide-react';

export function AdminManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<
    AdminUser | UserSearchResult | null
  >(null);
  const [showMakeAdminDialog, setShowMakeAdminDialog] = useState(false);
  const [showRemoveAdminDialog, setShowRemoveAdminDialog] = useState(false);

  const utils = api.useUtils();

  // Queries
  const { data: adminUsers, isLoading: adminUsersLoading } =
    api.admin.getAdminUsers.useQuery();
  const { data: searchResults, isLoading: searchLoading } =
    api.admin.searchUsers.useQuery(
      { query: searchQuery },
      { enabled: searchQuery.length > 0 }
    );

  // Mutations
  const makeAdminMutation = api.admin.makeUserAdmin.useMutation({
    onSuccess: () => {
      toast.success('User promoted to admin successfully');
      void utils.admin.getAdminUsers.invalidate();
      void utils.admin.searchUsers.invalidate();
      setShowMakeAdminDialog(false);
      setSelectedUser(null);
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const removeAdminMutation = api.admin.removeAdminRole.useMutation({
    onSuccess: () => {
      toast.success('Admin role removed successfully');
      void utils.admin.getAdminUsers.invalidate();
      void utils.admin.searchUsers.invalidate();
      setShowRemoveAdminDialog(false);
      setSelectedUser(null);
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const handleMakeAdmin = (user: UserSearchResult) => {
    setSelectedUser(user);
    setShowMakeAdminDialog(true);
  };

  const handleRemoveAdmin = (user: AdminUser) => {
    setSelectedUser(user);
    setShowRemoveAdminDialog(true);
  };

  const confirmMakeAdmin = () => {
    if (selectedUser) {
      makeAdminMutation.mutate({ userId: selectedUser.id });
    }
  };

  const confirmRemoveAdmin = () => {
    if (selectedUser) {
      removeAdminMutation.mutate({ userId: selectedUser.id });
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Admin Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Current Administrators
          </CardTitle>
          <CardDescription>
            Users with administrative privileges
          </CardDescription>
        </CardHeader>
        <CardContent>
          {adminUsersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {adminUsers?.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.image ?? undefined} />
                      <AvatarFallback>
                        {user.name?.charAt(0) ?? user.email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name ?? 'No Name'}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-800"
                    >
                      <Shield className="mr-1 h-3 w-3" />
                      Admin
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveAdmin(user)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {adminUsers?.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">
                  No admin users found
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and Promote Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Promote Users to Admin
          </CardTitle>
          <CardDescription>
            Search for users and grant them administrative privileges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by email or name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {searchLoading && searchQuery && (
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded bg-muted"
                  />
                ))}
              </div>
            )}

            {searchResults && searchQuery && (
              <div className="space-y-4">
                {searchResults.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.image ?? undefined} />
                        <AvatarFallback>
                          {user.name?.charAt(0) ?? user.email.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name ?? 'No Name'}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.isAdmin ? (
                        <Badge
                          variant="secondary"
                          className="bg-yellow-100 text-yellow-800"
                        >
                          <Shield className="mr-1 h-3 w-3" />
                          Admin
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMakeAdmin(user)}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Make Admin
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && (
                  <p className="py-4 text-center text-muted-foreground">
                    No users found matching your search
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Make Admin Dialog */}
      <Dialog open={showMakeAdminDialog} onOpenChange={setShowMakeAdminDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote User to Administrator</DialogTitle>
            <DialogDescription>
              Are you sure you want to grant administrator privileges to{' '}
              <strong>{selectedUser?.email}</strong>? This will give them full
              access to the admin panel and all administrative functions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMakeAdminDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmMakeAdmin}
              disabled={makeAdminMutation.isPending}
            >
              {makeAdminMutation.isPending ? 'Promoting...' : 'Make Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Admin Dialog */}
      <Dialog
        open={showRemoveAdminDialog}
        onOpenChange={setShowRemoveAdminDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Administrator Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove administrator privileges from{' '}
              <strong>{selectedUser?.email}</strong>? They will lose access to
              the admin panel and all administrative functions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRemoveAdminDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRemoveAdmin}
              disabled={removeAdminMutation.isPending}
            >
              {removeAdminMutation.isPending ? 'Removing...' : 'Remove Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
