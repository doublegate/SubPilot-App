import { type NextRequest } from 'next/server';
import { auth } from '@/server/auth.config';
import {
  getRealtimeNotificationManager,
  createSSEStream,
} from '@/server/lib/realtime-notifications';
import { AuditLogger } from '@/server/lib/audit-logger';

/**
 * Server-Sent Events endpoint for real-time notifications
 *
 * Usage: GET /api/realtime/notifications
 * Returns: text/event-stream with real-time notifications
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const session = await auth();

    if (!session?.user?.id) {
      return new Response('Unauthorized', {
        status: 401,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    const userId = session.user.id;
    const url = new URL(request.url);
    const connectionId =
      url.searchParams.get('connectionId') ??
      `conn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Connection management is handled by createSSEStream

    console.log(
      `[RealtimeSSE] Client connected: ${connectionId} for user ${userId}`
    );

    // Create the SSE stream using the library method
    const stream = createSSEStream(userId);

    // Set up proper SSE headers
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Log the connection
    AuditLogger.log({
      userId,
      action: 'realtime.sse_connected',
      resource: connectionId,
      result: 'success',
      metadata: {
        connectionId,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for'),
      },
    }).catch(console.error);

    return new Response(stream, {
      status: 200,
      headers,
    });
  } catch (_error) {
    console.error('[RealtimeSSE] Error setting up SSE connection:', _error);

    return new Response('Internal Server Error', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

/**
 * Handle SSE connection options
 */
export async function OPTIONS(_request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Cache-Control, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * POST endpoint for sending test notifications (development only)
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return new Response('Not Found', { status: 404 });
  }

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = (await request.json()) as {
      type?: string;
      title?: string;
      message?: string;
      priority?: 'low' | 'normal' | 'high';
      data?: Record<string, unknown>;
    };
    const { type, title, message, priority = 'normal', data = {} } = body;

    if (!type || !title || !message) {
      return new Response('Missing required fields: type, title, message', {
        status: 400,
      });
    }

    const realtimeManager = getRealtimeNotificationManager();

    // Send test notification
    realtimeManager.sendToUser(session.user.id, {
      type: type,
      title: title,
      message: message,
      priority: priority,
      data: {
        ...data,
        test: true,
        sentAt: new Date(),
      },
    });

    return Response.json({
      success: true,
      message: 'Test notification sent',
      notification: {
        type: type,
        title: title,
        message: message,
        priority: priority,
      },
    });
  } catch (_error) {
    console.error('[RealtimeSSE] Error sending test notification:', _error);

    return new Response('Internal Server Error', { status: 500 });
  }
}
