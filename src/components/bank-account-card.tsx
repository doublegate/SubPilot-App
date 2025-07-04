'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { api } from '@/trpc/react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Building2,
  CreditCard,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface BankAccountCardProps {
  item: {
    id: string;
    institutionName: string;
    institutionId: string;
    accounts: {
      id: string;
      name: string;
      type: string;
      mask: string;
    }[];
    lastWebhook: Date | null;
    status: string;
  };
}

export function BankAccountCard({ item }: BankAccountCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncMutation = api.plaid.syncTransactions.useMutation({
    onMutate: () => {
      setIsSyncing(true);
    },
    onSuccess: () => {
      toast.success('Bank account synced successfully');
      router.refresh();
    },
    onError: error => {
      toast.error(error.message);
    },
    onSettled: () => {
      setIsSyncing(false);
    },
  });

  const deleteMutation = api.plaid.deleteItem.useMutation({
    onSuccess: () => {
      toast.success('Bank connection removed');
      router.refresh();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const handleSync = () => {
    syncMutation.mutate({ itemId: item.id });
  };

  const handleDelete = () => {
    deleteMutation.mutate({ itemId: item.id });
    setShowDeleteDialog(false);
  };

  const isConsentExpired = item.status !== 'good';

  return (
    <React.Fragment>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">
                  {item.institutionName ?? 'Unknown Bank'}
                </CardTitle>
                <CardDescription className="text-sm">
                  {item.accounts.length}{' '}
                  {item.accounts.length === 1 ? 'account' : 'accounts'}
                </CardDescription>
              </div>
            </div>
            <Badge variant={isConsentExpired ? 'destructive' : 'success'}>
              {isConsentExpired ? (
                <>
                  <XCircle className="mr-1 h-3 w-3" />
                  Expired
                </>
              ) : (
                <>
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Active
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {item.accounts.map(account => (
              <div key={account.id} className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{account.name}</span>
                {account.mask && (
                  <span className="text-muted-foreground">
                    •••• {account.mask}
                  </span>
                )}
                {account.type && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {account.type}
                  </Badge>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            {item.lastWebhook && (
              <p>
                Last webhook:{' '}
                {format(new Date(item.lastWebhook), 'MMM d, yyyy h:mm a')}
              </p>
            )}
            <p>Status: {item.status}</p>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={isSyncing || deleteMutation.isPending}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
              />
              {isSyncing ? 'Syncing...' : 'Sync'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isSyncing || deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove bank connection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the connection to{' '}
              {item.institutionName ?? 'this bank'} and all associated accounts.
              Your transaction history will be preserved, but you won&apos;t
              receive new updates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Connection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </React.Fragment>
  );
}
