'use client';

import { useCallback, useState } from 'react';
import {
  usePlaidLink,
  type PlaidLinkOptions,
  type PlaidLinkOnSuccess,
} from 'react-plaid-link';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface PlaidLinkButtonProps {
  onSuccess?: () => void;
  className?: string;
}

export function PlaidLinkButton({
  onSuccess,
  className,
}: PlaidLinkButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Get link token from API
  const { data: linkTokenData, isLoading: isTokenLoading } =
    api.plaid.createLinkToken.useQuery(undefined, {
      retry: false,
      refetchOnWindowFocus: false,
    });

  // Exchange public token mutation
  const exchangePublicToken = api.plaid.exchangePublicToken.useMutation({
    onSuccess: () => {
      toast.success('Bank account connected successfully!');
      router.refresh();
      onSuccess?.();
    },
    onError: error => {
      toast.error(error.message || 'Failed to connect bank account');
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const onSuccessCallback = useCallback<PlaidLinkOnSuccess>(
    (publicToken, metadata) => {
      setIsLoading(true);

      // Extract the data we need from metadata
      const simplifiedMetadata = {
        institution: {
          name: metadata.institution?.name ?? 'Unknown Bank',
          institution_id: metadata.institution?.institution_id ?? '',
        },
        accounts: metadata.accounts.map(account => ({
          id: account.id,
          name: account.name,
          type: account.type,
          subtype: account.subtype,
          mask: account.mask,
        })),
      };

      exchangePublicToken.mutate({
        publicToken,
        metadata: simplifiedMetadata,
      });
    },
    [exchangePublicToken]
  );

  const config: PlaidLinkOptions = {
    token: linkTokenData?.linkToken ?? null,
    onSuccess: onSuccessCallback,
    onExit: err => {
      if (err) {
        console.error('Plaid Link error:', err);
      }
    },
  };

  const { open, ready } = usePlaidLink(config);

  const handleClick = useCallback(() => {
    if (ready && !isLoading) {
      open();
    }
  }, [ready, open, isLoading]);

  const isButtonDisabled =
    !ready || isTokenLoading || isLoading || !linkTokenData;

  return (
    <Button
      onClick={handleClick}
      disabled={isButtonDisabled}
      className={className}
      size="lg"
    >
      {isLoading || isTokenLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Plus className="mr-2 h-4 w-4" />
          Connect Bank Account
        </>
      )}
    </Button>
  );
}
