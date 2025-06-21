import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getServerAuthSession } from "@/server/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BankAccountsList } from "@/components/bank-accounts-list"
import { PlaidLinkButton } from "@/components/plaid-link-button"

export const metadata = {
  title: "Bank Accounts | SubPilot",
  description: "Manage your connected bank accounts",
}

export default async function AccountsPage() {
  const session = await getServerAuthSession()
  
  if (!session) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Accounts</h1>
          <p className="text-muted-foreground mt-2">
            Connect and manage your bank accounts to track subscriptions
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>
              Your bank accounts are securely connected through Plaid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<BankAccountsLoading />}>
              <BankAccountsList />
            </Suspense>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <PlaidLinkButton />
        </div>
      </div>
    </div>
  )
}

function BankAccountsLoading() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  )
}