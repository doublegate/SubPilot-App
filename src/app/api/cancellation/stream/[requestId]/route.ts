import { type NextRequest } from 'next/server';
import { auth } from '@/server/auth.config';
import { createSSEStream } from '@/server/lib/realtime-notifications';
import { db } from '@/server/db';

export const runtime = 'nodejs';

/**
 * Server-Sent Events endpoint for real-time cancellation updates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    // Verify authentication
    const session = await auth();

    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { requestId } = await params;
    const url = new URL(request.url);
    const orchestrationId = url.searchParams.get('orchestration');

    // Verify the cancellation request belongs to the user
    const cancellationRequest = await db.cancellationRequest.findFirst({
      where: {
        id: requestId,
        userId: session.user.id,
      },
    });

    if (!cancellationRequest) {
      return new Response('Cancellation request not found', { status: 404 });
    }

    // Create SSE stream with cancellation-specific data
    const stream = new ReadableStream({
      start(controller) {
        // Send initial cancellation status
        const initialMessage = `event: cancellation.status\ndata: ${JSON.stringify(
          {
            type: 'cancellation.status',
            requestId,
            orchestrationId,
            status: cancellationRequest.status,
            method: cancellationRequest.method,
            createdAt: cancellationRequest.createdAt,
            updatedAt: cancellationRequest.updatedAt,
          }
        )}\n\n`;

        controller.enqueue(new TextEncoder().encode(initialMessage));

        // Setup periodic status updates
        const updateInterval = setInterval(async () => {
          try {
            // Check for updated cancellation status
            const updatedRequest = await db.cancellationRequest.findUnique({
              where: { id: requestId },
              include: {
                logs: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            });

            if (updatedRequest) {
              const updateMessage = `event: cancellation.update\ndata: ${JSON.stringify(
                {
                  type: 'cancellation.update',
                  requestId,
                  orchestrationId,
                  status: updatedRequest.status,
                  lastLog: updatedRequest.logs[0],
                  updatedAt: updatedRequest.updatedAt,
                }
              )}\n\n`;

              controller.enqueue(new TextEncoder().encode(updateMessage));

              // Close stream if cancellation is complete
              if (
                ['completed', 'failed', 'cancelled'].includes(
                  updatedRequest.status
                )
              ) {
                clearInterval(updateInterval);
                controller.close();
              }
            }
          } catch (error) {
            console.error('[SSE] Error sending update:', error);
          }
        }, 2000); // Every 2 seconds

        // Cleanup on close
        return () => {
          clearInterval(updateInterval);
        };
      },
    });

    // Set up cleanup on disconnect
    request.signal.addEventListener('abort', () => {
      console.log(
        `[SSE] Client disconnected from cancellation stream: ${requestId}`
      );
      close();
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  } catch (error) {
    console.error('[SSE] Error setting up cancellation stream:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
