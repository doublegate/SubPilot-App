import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function NotificationsSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Notifications</h3>
        <p className="text-sm text-muted-foreground">
          Configure how you receive notifications about your subscriptions.
        </p>
      </div>
      <Separator />

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Receive email alerts for important subscription events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="renewal-reminders">Renewal Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Get notified 3 days before your subscriptions renew
              </p>
            </div>
            <Switch id="renewal-reminders" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="price-changes">Price Changes</Label>
              <p className="text-sm text-muted-foreground">
                Be alerted when subscription prices increase
              </p>
            </div>
            <Switch id="price-changes" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="new-subscriptions">New Subscriptions</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when new subscriptions are detected
              </p>
            </div>
            <Switch id="new-subscriptions" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="cancellation-confirmations">
                Cancellation Confirmations
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive confirmations when subscriptions are cancelled
              </p>
            </div>
            <Switch id="cancellation-confirmations" defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Weekly Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Reports</CardTitle>
          <CardDescription>
            Get weekly summaries of your subscription activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weekly-summary">Weekly Summary</Label>
              <p className="text-sm text-muted-foreground">
                Receive a weekly email with spending insights and upcoming
                renewals
              </p>
            </div>
            <Switch id="weekly-summary" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="monthly-insights">Monthly Insights</Label>
              <p className="text-sm text-muted-foreground">
                Get detailed monthly reports with trends and recommendations
              </p>
            </div>
            <Switch id="monthly-insights" />
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>
            Receive push notifications on your devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="browser-notifications">
                Browser Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Show notifications in your browser for urgent alerts
              </p>
            </div>
            <Switch id="browser-notifications" />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mobile-notifications">Mobile Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send push notifications to your mobile device
              </p>
            </div>
            <Switch id="mobile-notifications" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
