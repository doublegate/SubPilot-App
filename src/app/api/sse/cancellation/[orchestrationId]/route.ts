import { NextRequest } from 'next/server';
import { auth } from '@/server/auth.config';
import { UnifiedCancellationOrchestratorEnhancedService } from '@/server/services/unified-cancellation-orchestrator-enhanced.service';
import { db } from '@/server/db';

/**
 * Server-Sent Events endpoint for real-time cancellation updates
 * 
 * Provides real-time updates for cancellation orchestrations including:
 * - Status changes
 * - Method attempts and failures
 * - Progress updates
 * - Error notifications
 * - Completion events
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orchestrationId: string }> }
) {
  try {
    // Authenticate the user
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { orchestrationId } = await params;
    
    // Validate orchestration ownership
    const orchestrationLogs = await db.cancellationLog.findMany({
      where: {
        metadata: {
          path: ['orchestrationId'],
          equals: orchestrationId,
        },
      },
      take: 1,
    });

    if (orchestrationLogs.length === 0) {
      return new Response('Orchestration not found', { status: 404 });
    }

    // Verify user has access to this orchestration
    const metadata = orchestrationLogs[0]?.metadata as { userId?: string } | null;
    const orchestrationUserId = metadata?.userId;
    if (orchestrationUserId !== session.user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    // Create Server-Sent Events stream
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection confirmation
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              type: 'connection_established',
              orchestrationId,
              timestamp: new Date().toISOString(),
              message: 'Real-time updates connected',
            })}\n\n`
          )
        );

        // Get orchestrator service
        const orchestrator = new UnifiedCancellationOrchestratorEnhancedService(db);

        // Subscribe to real-time updates
        const unsubscribe = orchestrator.subscribeToUpdates(orchestrationId, (update) => {
          try {
            const eventData = {
              type: 'orchestration_update',
              orchestrationId,
              timestamp: new Date().toISOString(),
              ...update,
            };

            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify(eventData)}\n\n`)
            );
          } catch (error) {
            console.error('[SSE] Error sending update:', error);
          }
        });

        // Send periodic heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: 'heartbeat',
                  timestamp: new Date().toISOString(),
                })}\n\n`
              )
            );
          } catch (error) {
            // Connection likely closed
            clearInterval(heartbeatInterval);
            unsubscribe();
          }
        }, 30000); // Every 30 seconds

        // Send status updates every 5 seconds for active orchestrations
        const statusInterval = setInterval(async () => {
          try {
            const status = await orchestrator.getOrchestrationStatus(orchestrationId);
            if (status) {
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    type: 'status_sync',
                    orchestrationId,
                    timestamp: new Date().toISOString(),
                    status: status.status,
                    lastUpdate: status.lastUpdate,
                  })}\n\n`
                )
              );

              // Stop status updates if orchestration is completed
              if (['completed', 'failed', 'cancelled'].includes(status.status)) {
                clearInterval(statusInterval);
                
                // Send final completion event
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      type: 'orchestration_final',
                      orchestrationId,
                      timestamp: new Date().toISOString(),
                      finalStatus: status.status,
                      message: 'Orchestration completed',
                    })}\n\n`
                  )
                );
              }
            }
          } catch (error) {
            console.error('[SSE] Error in status update:', error);
          }
        }, 5000); // Every 5 seconds

        // Clean up when stream is closed
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval);
          clearInterval(statusInterval);
          unsubscribe();
          try {
            controller.close();
          } catch (error) {
            // Stream already closed
          }
        });

        // Auto-cleanup after 30 minutes to prevent resource leaks
        setTimeout(() => {
          clearInterval(heartbeatInterval);
          clearInterval(statusInterval);
          unsubscribe();
          try {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: 'timeout',
                  orchestrationId,
                  timestamp: new Date().toISOString(),
                  message: 'Connection timeout - please refresh',
                })}\n\n`
              )
            );
            controller.close();
          } catch (error) {
            // Stream already closed
          }
        }, 30 * 60 * 1000); // 30 minutes
      },
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error('[SSE] Error in cancellation stream:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}