import Link from 'next/link';

type AuthErrorPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuthErrorPage({
  searchParams,
}: AuthErrorPageProps) {
  const params = await searchParams;
  const error = (params.error as string) ?? 'Unknown error';

  const errorMessages: Record<string, string> = {
    Configuration:
      'OAuth authentication is not properly configured. Please contact support if this issue persists.',
    AccessDenied: 'You do not have permission to sign in.',
    Verification:
      'The sign in link is no longer valid. It may have been used already or it may have expired.',
    OAuthSignin: 'Error in constructing an authorization URL.',
    OAuthCallback: 'Error in handling the response from an OAuth provider.',
    OAuthCreateAccount: 'Could not create OAuth provider user in the database.',
    EmailCreateAccount: 'Could not create email provider user in the database.',
    Callback: 'Error in the OAuth callback handler route.',
    OAuthAccountNotLinked:
      'An account with this email already exists. Please sign in with your original provider first, then link your GitHub account from your profile settings.',
    EmailSignin: 'The e-mail could not be sent. Please try again later.',
    CredentialsSignin:
      'Sign in failed. Check the details you provided are correct.',
    SessionRequired: 'Please sign in to access this page.',
    Default: 'Unable to sign in. Please try again later.',
  };

  const errorMessage = errorMessages[error] ?? errorMessages.Default;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-cyan-50 to-purple-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Authentication Error
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Something went wrong during sign in
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            <div className="mt-4 text-center">
              <h2 className="text-lg font-medium text-gray-900">{error}</h2>
              <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>
              {error === 'OAuthAccountNotLinked' && (
                <div className="mt-4 rounded-md bg-blue-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-blue-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3 text-left">
                      <h3 className="text-sm font-medium text-blue-800">
                        How to link your GitHub account
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <ol className="list-inside list-decimal space-y-1">
                          <li>Sign in with Google (your original provider)</li>
                          <li>Go to your Profile settings</li>
                          <li>
                            Link your GitHub account in the Connected Accounts
                            section
                          </li>
                        </ol>
                        <p className="mt-2">
                          <strong>Note:</strong> Account linking will be
                          available in the next update.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {error === 'Configuration' && (
                <div className="mt-4 rounded-md bg-blue-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-blue-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        For administrators
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          OAuth credentials need to be configured in Vercel:
                        </p>
                        <ol className="mt-2 list-inside list-decimal space-y-1">
                          <li>Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET</li>
                          <li>Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET</li>
                          <li>Set NEXTAUTH_URL to https://subpilot.app</li>
                          <li>Redeploy the application</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
            >
              Try again
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-gray-600 hover:text-gray-500"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
