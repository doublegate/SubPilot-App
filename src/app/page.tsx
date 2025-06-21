import Link from "next/link"

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-cyan-50 to-purple-50">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-[5rem]">
          Sub<span className="text-cyan-600">Pilot</span>
        </h1>
        <p className="text-xl text-gray-600 text-center max-w-lg">
          Your command center for recurring finances. Monitor, manage, and cancel subscriptions automatically.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
          <Link
            className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/80 p-4 text-gray-900 hover:bg-white/90 shadow-lg"
            href="/dashboard"
          >
            <h3 className="text-2xl font-bold">Get Started →</h3>
            <div className="text-lg">
              Connect your bank account and start tracking your subscriptions.
            </div>
          </Link>
          <Link
            className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/80 p-4 text-gray-900 hover:bg-white/90 shadow-lg"
            href="/login"
          >
            <h3 className="text-2xl font-bold">Sign In →</h3>
            <div className="text-lg">
              Already have an account? Sign in to view your dashboard.
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}