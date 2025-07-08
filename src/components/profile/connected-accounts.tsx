'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Icons } from '@/components/ui/icons';
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

type Provider = 'google' | 'github';

interface ProviderInfo {
  id: Provider;
  name: string;
  icon: React.ReactNode;
  color: string;
}

const providers: Record<Provider, ProviderInfo> = {
  google: {
    id: 'google',
    name: 'Google',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
    color: 'hover:bg-blue-50',
  },
  github: {
    id: 'github',
    name: 'GitHub',
    icon: <Icons.github className="h-5 w-5" />,
    color: 'hover:bg-gray-50',
  },
};

export function ConnectedAccounts() {
  const [unlinkProvider, setUnlinkProvider] = useState<Provider | null>(null);
  const [isLinking, setIsLinking] = useState<Provider | null>(null);
  const searchParams = useSearchParams();

  const {
    data: availableProviders,
    isLoading,
    refetch: refetchProviders,
  } = api.oauthAccounts.getAvailableProviders.useQuery();

  const { data: connectedAccounts, refetch: refetchAccounts } =
    api.oauthAccounts.getConnectedAccounts.useQuery();

  // Check for successful linking
  useEffect(() => {
    const linked = searchParams.get('linked');
    if (linked) {
      toast.success(`Successfully connected ${linked} account!`);
      // Refetch data to show updated connection status
      void refetchProviders();
      void refetchAccounts();

      // Remove the query parameter from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('linked');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, refetchProviders, refetchAccounts]);

  const unlinkMutation = api.oauthAccounts.unlinkAccount.useMutation({
    onSuccess: () => {
      toast.success('Account unlinked successfully');
      setUnlinkProvider(null);
      // Refetch data to show updated connection status
      void refetchProviders();
      void refetchAccounts();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const initiateLinkingMutation = api.oauthAccounts.initiateLinking.useMutation(
    {
      onSuccess: data => {
        // Redirect to OAuth provider
        window.location.href = data.authUrl;
      },
      onError: error => {
        toast.error(error.message);
        setIsLinking(null);
      },
    }
  );

  const handleLink = async (provider: Provider) => {
    setIsLinking(provider);
    await initiateLinkingMutation.mutateAsync({ provider });
  };

  const handleUnlink = async () => {
    if (!unlinkProvider) return;
    await unlinkMutation.mutateAsync({ provider: unlinkProvider });
  };

  // Count connected accounts
  const connectedCount = connectedAccounts?.length ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {availableProviders?.map(providerData => {
          const provider = providers[providerData.id as Provider];
          const isConnected = providerData.connected;

          return (
            <div
              key={provider.id}
              className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                isConnected ? '' : provider.color
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  {provider.icon}
                </div>
                <div>
                  <p className="font-medium">{provider.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {isConnected ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              {isConnected ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setUnlinkProvider(provider.id)}
                  disabled={connectedCount <= 1 || unlinkMutation.isPending}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLink(provider.id)}
                  disabled={isLinking === provider.id}
                >
                  {isLinking === provider.id ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </Button>
              )}
            </div>
          );
        })}

        {connectedCount <= 1 && (
          <p className="text-sm text-muted-foreground">
            <Icons.info className="mr-1 inline h-4 w-4" />
            You must have at least one connected account to sign in.
          </p>
        )}
      </div>

      <AlertDialog
        open={!!unlinkProvider}
        onOpenChange={() => setUnlinkProvider(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Disconnect {unlinkProvider && providers[unlinkProvider].name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect your{' '}
              {unlinkProvider && providers[unlinkProvider].name} account?
              You&apos;ll no longer be able to sign in with{' '}
              {unlinkProvider && providers[unlinkProvider].name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              className="bg-red-600 hover:bg-red-700"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
