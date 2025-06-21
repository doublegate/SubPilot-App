"use client"

import { api } from "@/trpc/react"
import { AccountList } from "@/components/account-list"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function BankAccountsList() {
  const { data: accounts, isLoading, error } = api.plaid.getAccounts.useQuery()

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load bank accounts. Please try again later.
        </AlertDescription>
      </Alert>
    )
  }

  if (!isLoading && (!accounts || accounts.length === 0)) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No bank accounts connected yet. Connect your first account to start tracking subscriptions.
        </p>
      </div>
    )
  }

  return <AccountList accounts={accounts || []} loading={isLoading} />
}