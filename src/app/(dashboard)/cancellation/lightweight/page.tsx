import { Suspense } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from '@/components/ui/icons';
import { LightweightCancellationDashboard } from '@/components/cancellation/lightweight-cancellation-dashboard';

export default function LightweightCancellationPage() {
  return (
    <div className="container mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Icons.fileText className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Lightweight Cancellation</h1>
            <p className="text-muted-foreground">
              Simple, reliable subscription cancellation with step-by-step
              instructions
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Badge
            variant="outline"
            className="border-green-200 bg-green-50 text-green-700"
          >
            <Icons.check className="mr-1 h-3 w-3" />
            Fast Implementation
          </Badge>
          <Badge
            variant="outline"
            className="border-blue-200 bg-blue-50 text-blue-700"
          >
            <Icons.settings className="mr-1 h-3 w-3" />
            Easy Maintenance
          </Badge>
          <Badge
            variant="outline"
            className="border-purple-200 bg-purple-50 text-purple-700"
          >
            <Icons.user className="mr-1 h-3 w-3" />
            User Control
          </Badge>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icons.zap className="h-4 w-4 text-yellow-500" />
              Quick Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No external dependencies or complex configuration. Works out of
              the box with built-in provider templates.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icons.shield className="h-4 w-4 text-green-500" />
              Always Reliable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manual instructions work for any service. No dependency on APIs or
              automation that might fail.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icons.wrench className="h-4 w-4 text-blue-500" />
              Easy to Maintain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Simple provider templates that are easy to add, update, and debug.
              Clear separation of concerns.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.helpCircle className="h-5 w-5" />
            How It Works
          </CardTitle>
          <CardDescription>
            The lightweight cancellation system provides step-by-step
            instructions for manual subscription cancellation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="flex flex-col items-center space-y-2 text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600">
                1
              </div>
              <h4 className="font-medium">Select Subscription</h4>
              <p className="text-xs text-muted-foreground">
                Click cancel on any subscription in your dashboard
              </p>
            </div>

            <div className="flex flex-col items-center space-y-2 text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600">
                2
              </div>
              <h4 className="font-medium">Get Instructions</h4>
              <p className="text-xs text-muted-foreground">
                Receive tailored step-by-step cancellation instructions
              </p>
            </div>

            <div className="flex flex-col items-center space-y-2 text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600">
                3
              </div>
              <h4 className="font-medium">Follow Steps</h4>
              <p className="text-xs text-muted-foreground">
                Complete the cancellation using the provided guide
              </p>
            </div>

            <div className="flex flex-col items-center space-y-2 text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 font-semibold text-green-600">
                4
              </div>
              <h4 className="font-medium">Confirm Status</h4>
              <p className="text-xs text-muted-foreground">
                Update your subscription status in the app
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supported Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.grid3x3 className="h-5 w-5" />
            Supported Services
          </CardTitle>
          <CardDescription>
            Built-in templates for popular subscription services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: 'Netflix',
                difficulty: 'easy',
                time: 3,
                category: 'streaming',
              },
              {
                name: 'Spotify',
                difficulty: 'easy',
                time: 2,
                category: 'music',
              },
              {
                name: 'Adobe Creative Cloud',
                difficulty: 'medium',
                time: 8,
                category: 'software',
              },
              {
                name: 'Amazon Prime',
                difficulty: 'easy',
                time: 4,
                category: 'shopping',
              },
              {
                name: 'iCloud+',
                difficulty: 'medium',
                time: 5,
                category: 'cloud',
              },
              {
                name: 'Any Other Service',
                difficulty: 'medium',
                time: 10,
                category: 'other',
              },
            ].map(service => (
              <div
                key={service.name}
                className="space-y-2 rounded-lg border p-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{service.name}</h4>
                  <Badge
                    variant="outline"
                    className={
                      service.difficulty === 'easy'
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-yellow-200 bg-yellow-50 text-yellow-700'
                    }
                  >
                    {service.difficulty}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Est. time: {service.time} min</span>
                    <span className="capitalize">{service.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Information Alert */}
      <Alert>
        <Icons.info className="h-4 w-4" />
        <AlertDescription>
          This system provides manual cancellation instructions. While it
          requires user action, it works reliably for any subscription service
          and gives you full control over the process. For services not in our
          database, generic instructions are provided.
        </AlertDescription>
      </Alert>

      {/* Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Your Cancellation Requests</CardTitle>
          <CardDescription>
            Track your cancellation progress and manage pending requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-8">
                <Icons.spinner className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading dashboard...</span>
              </div>
            }
          >
            <LightweightCancellationDashboard />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
