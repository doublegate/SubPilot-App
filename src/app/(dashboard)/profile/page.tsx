import { auth } from '@/server/auth';
import { ProfileForm } from '@/components/profile/profile-form';
import { ConnectedAccounts } from '@/components/profile/connected-accounts';

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    return <div>Please sign in to access your profile.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="space-y-8">
        {/* Profile Information */}
        <div className="rounded-lg bg-card p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Profile Information</h2>
          <ProfileForm />
        </div>

        {/* Connected Accounts */}
        <div className="rounded-lg bg-card p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Connected Accounts</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Connect additional sign-in methods to your account for easier access
          </p>
          <ConnectedAccounts />
        </div>

        {/* Notification Preferences */}
        <div className="rounded-lg bg-card p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Notification Preferences
          </h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive email updates about your subscriptions
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                aria-label="Enable email notifications for subscription updates"
                className="h-4 w-4 rounded border-border text-cyan-600 focus:ring-cyan-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium">Renewal Reminders</p>
                <p className="text-sm text-muted-foreground">
                  Get notified before subscriptions renew
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                aria-label="Enable renewal reminder notifications before subscriptions renew"
                className="h-4 w-4 rounded border-border text-cyan-600 focus:ring-cyan-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium">Price Change Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Alert when subscription prices change
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                aria-label="Enable alerts for subscription price changes"
                className="h-4 w-4 rounded border-border text-cyan-600 focus:ring-cyan-500"
              />
            </label>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-lg border border-red-200 bg-card p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-red-600">
            Danger Zone
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
              <button
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                aria-label="Permanently delete your account and all data"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
