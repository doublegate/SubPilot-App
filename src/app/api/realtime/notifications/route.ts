import { type NextRequest } from 'next/server';
import { auth } from '@/server/auth.config';
import { getRealtimeNotificationManager } from '@/server/lib/realtime-notifications';
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
      url.searchParams.get('connectionId') ||
      `conn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Get real-time notification manager
    const realtimeManager = getRealtimeNotificationManager();

    console.log(
      `[RealtimeSSE] Client connected: ${connectionId} for user ${userId}`
    );

    // Create the SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        const sseData = `event: connection\ndata: ${JSON.stringify({
          status: 'connected',
          timestamp: new Date().toISOString(),
          connectionId,
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(sseData));

        // Setup ping interval
        const pingInterval = setInterval(() => {
          try {
            const pingData = `event: ping\ndata: ${JSON.stringify({
              timestamp: new Date().toISOString(),
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(pingData));
          } catch (error) {
            console.error('[RealtimeSSE] Error sending ping:', error);
            clearInterval(pingInterval);
          }
        }, 30000); // 30 seconds

        // Cleanup on close
        return () => {
          clearInterval(pingInterval);
        };
      },
    });

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
  } catch (error) {
    console.error('[RealtimeSSE] Error setting up SSE connection:', error);

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
export async function OPTIONS(request: NextRequest) {
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

    const body = await request.json();
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
      title,
      message,
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
        type,
        title,
        message,
        priority,
      },
    });
  } catch (error) {
    console.error('[RealtimeSSE] Error sending test notification:', error);

    return new Response('Internal Server Error', { status: 500 });
  }
}
