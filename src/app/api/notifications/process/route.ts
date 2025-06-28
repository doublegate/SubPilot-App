import { NextResponse } from 'next/server';
import { getServerAuthSession } from '~/server/auth';
import { scheduledNotificationService } from '~/server/services/scheduled-notifications';

export async function POST() {
  try {
    // Only allow in development or with admin auth
    if (process.env.NODE_ENV !== 'development') {
      const session = await getServerAuthSession();
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // You could add admin check here
      // if (!session.user.isAdmin) {
      //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      // }
    }

    // Run scheduled notification checks
    await scheduledNotificationService.runScheduledChecks();

    return NextResponse.json({
      success: true,
      message: 'Scheduled notifications processed successfully',
    });
  } catch (error) {
    console.error('Error processing scheduled notifications:', error);
    return NextResponse.json(
      { error: 'Failed to process notifications' },
      { status: 500 }
    );
  }
}
