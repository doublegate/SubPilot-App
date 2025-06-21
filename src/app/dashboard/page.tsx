import { redirect } from "next/navigation"
import { auth } from "@/server/auth"
import { SignOutButton } from "@/components/auth/sign-out-button"

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <a className="mr-6 flex items-center space-x-2" href="/dashboard">
              <span className="font-bold text-xl">SubPilot</span>
            </a>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <nav className="flex items-center">
              <SignOutButton />
            </nav>
          </div>
        </div>
      </header>
      
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
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                  Connect Bank Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}