'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TwoFactorSetup } from '@/components/settings/two-factor-setup';
import { TwoFactorManage } from '@/components/settings/two-factor-manage';
import { api } from '@/trpc/react';

export default function SettingsPage() {
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);

  // Get 2FA status
  const { data: twoFactorStatus } = api.twoFactor.getStatus.useQuery();
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure how and when you receive email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="renewal-reminders">Renewal Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified before subscriptions renew
                  </p>
                </div>
                <Switch id="renewal-reminders" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="price-changes">Price Change Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Alert when subscription prices change
                  </p>
                </div>
                <Switch id="price-changes" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="new-subscriptions">
                    New Subscription Detected
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when new recurring payments are found
                  </p>
                </div>
                <Switch id="new-subscriptions" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly-summary">Weekly Summary</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a weekly overview of your subscriptions
                  </p>
                </div>
                <Switch id="weekly-summary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Timing</CardTitle>
              <CardDescription>
                When should we send you notifications?
              </CardDescription>
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
                <p className="mb-2 text-sm text-muted-foreground">
                  Don&apos;t send notifications during these hours
                </p>
                <div className="flex items-center gap-2">
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
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {twoFactorStatus?.enabled ? (
                <TwoFactorManage
                  method={twoFactorStatus.method}
                  phone={twoFactorStatus.phone}
                  onDisabled={() => {
                    // Refresh the status
                  }}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">Status</p>
                    <p className="text-sm text-muted-foreground">
                      Two-factor authentication is currently disabled
                    </p>
                  </div>
                  <Button onClick={() => setShowTwoFactorSetup(true)}>
                    Enable 2FA
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Manage your active sessions across devices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Current Session</p>
                  <p className="text-sm text-muted-foreground">
                    Chrome on MacOS • Los Angeles, CA
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Last active: Just now
                  </p>
                </div>
                <Badge variant="secondary">This device</Badge>
              </div>
              <Button variant="outline" className="w-full">
                Sign out all other sessions
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data & Privacy</CardTitle>
              <CardDescription>
                Manage your data and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">
                Download my data
              </Button>
              <Button variant="outline" className="w-full">
                Export subscriptions as CSV
              </Button>
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
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button variant="destructive">Delete Account</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TwoFactorSetup
        open={showTwoFactorSetup}
        onOpenChange={setShowTwoFactorSetup}
        onSuccess={() => {
          setShowTwoFactorSetup(false);
        }}
      />
    </div>
  );
}
