'use client';

import { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, CreditCard, PiggyBank, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Account {
  id: string;
  plaidAccountId: string;
  name: string;
  type: string;
  subtype: string;
  balance: number;
  currency: string;
  institution: {
    name: string;
    logo?: string | null;
  };
  isActive: boolean;
  lastSync: Date | null;
}

interface AccountListProps {
  accounts: Account[];
  onSelectAccount?: (accountId: string) => void;
  selectedAccountId?: string;
}

export function AccountList({
  accounts,
  onSelectAccount,
  selectedAccountId,
}: AccountListProps) {
  // Optimized click handler with useCallback
  const handleAccountClick = useCallback(
    (accountId: string) => () => onSelectAccount?.(accountId),
    [onSelectAccount]
  );

  const getAccountIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'depository':
        return <PiggyBank className="h-5 w-5" />;
      case 'credit':
        return <CreditCard className="h-5 w-5" />;
      case 'investment':
        return <TrendingUp className="h-5 w-5" />;
      default:
        return <Building2 className="h-5 w-5" />;
    }
  };

  const getAccountTypeLabel = (type: string, subtype: string) => {
    const typeLabels: Record<string, string> = {
      depository: 'Bank Account',
      credit: 'Credit Card',
      investment: 'Investment',
      loan: 'Loan',
    };

    return `${typeLabels[type.toLowerCase()] ?? type} - ${subtype}`;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (accounts.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No accounts connected</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {accounts.map(account => (
        <Card
          key={account.id}
          className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedAccountId === account.id ? 'ring-2 ring-primary' : ''
          } ${!account.isActive ? 'opacity-60' : ''}`}
          onClick={handleAccountClick(account.id)}
        >
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-gray-600 to-gray-800 text-white">
                  {getAccountIcon(account.type)}
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    {account.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {account.institution.name}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {getAccountTypeLabel(account.type, account.subtype)}
              </Badge>
              {!account.isActive && (
                <Badge
                  variant="secondary"
                  className="bg-gray-500/10 text-gray-600"
                >
                  Inactive
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className="text-2xl font-bold">
                {formatCurrency(account.balance, account.currency)}
              </p>
            </div>

            {account.lastSync && (
              <p className="text-xs text-muted-foreground">
                Last synced{' '}
                {formatDistanceToNow(account.lastSync, { addSuffix: true })}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
