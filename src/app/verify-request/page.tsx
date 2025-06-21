import Link from "next/link"

export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-cyan-50 to-purple-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Check your email
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            A sign in link has been sent to your email address
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <h2 className="text-lg font-medium text-gray-900">
                Check your inbox
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                We&apos;ve sent you a magic link. Click the link in the email to sign in to your account.
              </p>
              <p className="mt-4 text-xs text-gray-500">
                The link will expire in 24 hours. If you don&apos;t see the email, check your spam folder.
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm font-medium text-cyan-600 hover:text-cyan-500"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}