'use client';

import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, BellOff, Check, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const router = useRouter();
  const utils = api.useUtils();

  // Fetch notifications
  const { data, isLoading, refetch } = api.notifications.getAll.useQuery({
    limit: 50,
  });

  // Mutations
  const markAsReadMutation = api.notifications.markAsRead.useMutation({
    onSuccess: () => {
      void refetch();
      void utils.notifications.getUnreadCount.invalidate();
    },
  });

  const markAllAsReadMutation = api.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      toast.success('All notifications marked as read');
      void refetch();
      void utils.notifications.getUnreadCount.invalidate();
    },
  });

  const deleteMutation = api.notifications.delete.useMutation({
    onSuccess: () => {
      toast.success('Notification deleted');
      void refetch();
      void utils.notifications.getUnreadCount.invalidate();
    },
  });

  if (isLoading) {
    return <NotificationsSkeleton />;
  }

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your subscription activity
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            <Check className="mr-2 h-4 w-4" />
            Mark All as Read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BellOff className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium">No notifications yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We'll notify you when something important happens
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-colors ${
                !notification.read ? 'border-cyan-200 bg-cyan-50/50 dark:border-cyan-900 dark:bg-cyan-950/20' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-cyan-600" />
                        {notification.title}
                      </div>
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {notification.message}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsReadMutation.mutate({ id: notification.id })}
                        disabled={markAsReadMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate({ id: notification.id })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </p>
              </CardHeader>
              {notification.type === 'subscription_detected' && notification.metadata && (
                <CardContent className="pt-0">
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => {
                      // Mark as read first
                      if (!notification.read) {
                        markAsReadMutation.mutate({ id: notification.id });
                      }
                      // Navigate to subscriptions
                      router.push('/subscriptions');
                    }}
                  >
                    View detected subscriptions →
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-64" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}