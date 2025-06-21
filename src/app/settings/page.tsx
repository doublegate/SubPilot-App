import { redirect } from "next/navigation"
import { auth } from "@/server/auth"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { NavHeader } from "@/components/layout/nav-header"

export default async function SettingsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <>
      <NavHeader />
      <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure how and when you receive email notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="renewal-reminders">Renewal Reminders</Label>
                  <p className="text-sm text-gray-500">Get notified before subscriptions renew</p>
                </div>
                <Switch id="renewal-reminders" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="price-changes">Price Change Alerts</Label>
                  <p className="text-sm text-gray-500">Alert when subscription prices change</p>
                </div>
                <Switch id="price-changes" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="new-subscriptions">New Subscription Detected</Label>
                  <p className="text-sm text-gray-500">Notify when new recurring payments are found</p>
                </div>
                <Switch id="new-subscriptions" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly-summary">Weekly Summary</Label>
                  <p className="text-sm text-gray-500">Receive a weekly overview of your subscriptions</p>
                </div>
                <Switch id="weekly-summary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Timing</CardTitle>
              <CardDescription>When should we send you notifications?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reminder-days">Renewal reminder timing</Label>
                <Select defaultValue="7">
                  <SelectTrigger id="reminder-days" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day before</SelectItem>
                    <SelectItem value="3">3 days before</SelectItem>
                    <SelectItem value="7">7 days before</SelectItem>
                    <SelectItem value="14">14 days before</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quiet-hours">Quiet hours</Label>
                <p className="text-sm text-gray-500 mb-2">Don't send notifications during these hours</p>
                <div className="flex gap-2 items-center">
                  <Select defaultValue="22">
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>to</span>
                  <Select defaultValue="8">
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">Status</p>
                  <p className="text-sm text-gray-500">Two-factor authentication is currently disabled</p>
                </div>
                <Button>Enable 2FA</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Manage your active sessions across devices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Current Session</p>
                  <p className="text-sm text-gray-500">Chrome on MacOS • Los Angeles, CA</p>
                  <p className="text-xs text-gray-400">Last active: Just now</p>
                </div>
                <Badge variant="secondary">This device</Badge>
              </div>
              <Button variant="outline" className="w-full">Sign out all other sessions</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>You are currently on the free plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-gradient-to-r from-cyan-50 to-purple-50">
                  <h3 className="font-medium">Free Plan</h3>
                  <p className="text-sm text-gray-600 mt-1">Track up to 10 subscriptions</p>
                  <ul className="text-sm text-gray-500 mt-2 space-y-1">
                    <li>• Basic subscription tracking</li>
                    <li>• Email notifications</li>
                    <li>• 1 bank account connection</li>
                  </ul>
                </div>
                <Button className="w-full">Upgrade to Pro</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data & Privacy</CardTitle>
              <CardDescription>Manage your data and privacy settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">Download my data</Button>
              <Button variant="outline" className="w-full">Export subscriptions as CSV</Button>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-gray-500">Permanently delete your account and all data</p>
                </div>
                <Button variant="destructive">Delete Account</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </>
  )
}