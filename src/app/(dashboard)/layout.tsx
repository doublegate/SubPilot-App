import { NavHeader } from "@/components/layout/nav-header"
import { auth } from "@/server/auth"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">
        <div className="container py-6">
          {children}
        </div>
      </main>
    </div>
  )
}