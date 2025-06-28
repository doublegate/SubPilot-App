'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { api } from '@/trpc/react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { CreateAccountDialog } from './create-account-dialog';
import { PremiumFeatureGate } from '../billing/premium-feature-gate';

export function AccountSwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const { data: accounts } = api.account.list.useQuery();
  const switchAccount = api.account.switchAccount.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  const handleSelectAccount = async (accountId: string | null) => {
    setSelectedAccountId(accountId);
    await switchAccount.mutateAsync({ accountId });
    setOpen(false);
  };

  const currentAccount = accounts?.find(acc => acc.id === selectedAccountId);
  const personalAccount = { id: null, name: 'Personal', type: 'personal' };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between"
          >
            <div className="flex items-center gap-2">
              {currentAccount ? (
                <>
                  <Users className="h-4 w-4" />
                  <span className="truncate">{currentAccount.name}</span>
                </>
              ) : (
                <>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src="/placeholder-avatar.png" />
                    <AvatarFallback>ME</AvatarFallback>
                  </Avatar>
                  <span>Personal</span>
                </>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search accounts..." />
            <CommandList>
              <CommandEmpty>No accounts found.</CommandEmpty>
              
              <CommandGroup heading="Personal">
                <CommandItem
                  onSelect={() => handleSelectAccount(null)}
                  className="cursor-pointer"
                >
                  <Avatar className="mr-2 h-6 w-6">
                    <AvatarImage src="/placeholder-avatar.png" />
                    <AvatarFallback>ME</AvatarFallback>
                  </Avatar>
                  <span>Personal</span>
                  {selectedAccountId === null && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </CommandItem>
              </CommandGroup>

              {accounts && accounts.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Team Accounts">
                    {accounts.map((account) => (
                      <CommandItem
                        key={account.id}
                        onSelect={() => handleSelectAccount(account.id)}
                        className="cursor-pointer"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        <span className="truncate">{account.name}</span>
                        {selectedAccountId === account.id && (
                          <Check className="ml-auto h-4 w-4" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              <CommandSeparator />
              <CommandGroup>
                <PremiumFeatureGate
                  feature="multi_account"
                  requiredPlan="team"
                  fallback={
                    <CommandItem className="cursor-pointer opacity-50">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Team Account
                      <span className="ml-auto text-xs">Pro</span>
                    </CommandItem>
                  }
                >
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      setShowCreateDialog(true);
                    }}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Team Account
                  </CommandItem>
                </PremiumFeatureGate>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <CreateAccountDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  );
}