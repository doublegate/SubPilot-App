import { redirect } from "next/navigation"
import { auth } from "@/server/auth"
import { NavHeader } from "@/components/layout/nav-header"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      
      <main className="flex-1">
        <div className="container py-6">
          <div className="flex flex-col space-y-8">
            <div className="flex items-center justify-between space-y-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">
                  Welcome back, {session.user.name ?? session.user.email}!
                </h2>
                <p className="text-muted-foreground">
                  Here&apos;s an overview of your subscriptions
                </p>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="tracking-tight text-sm font-medium">
                    Total Subscriptions
                  </h3>
                </div>
                <div className="p-6 pt-0">
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    Connect your bank to get started
                  </p>
                </div>
              </div>
              
              <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="tracking-tight text-sm font-medium">
                    Monthly Spend
                  </h3>
                </div>
                <div className="p-6 pt-0">
                  <div className="text-2xl font-bold">$0.00</div>
                  <p className="text-xs text-muted-foreground">
                    +0% from last month
                  </p>
                </div>
              </div>
              
              <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="tracking-tight text-sm font-medium">
                    Active Services
                  </h3>
                </div>
                <div className="p-6 pt-0">
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    0 services detected
                  </p>
                </div>
              </div>
              
              <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                  <h3 className="tracking-tight text-sm font-medium">
                    Savings Potential
                  </h3>
                </div>
                <div className="p-6 pt-0">
                  <div className="text-2xl font-bold">$0.00</div>
                  <p className="text-xs text-muted-foreground">
                    Based on usage analysis
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Get Started</h3>
                <p className="text-muted-foreground mb-4">
                  Connect your bank account to automatically detect and manage your subscriptions.
                </p>
                <Button asChild>
                  <Link href="/banks/connect">Connect Bank Account</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}