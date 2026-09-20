/**
 * Extraction Job Events — GET /api/extraction-jobs/[jobId]/events
 *
 * Streams ExtractionJob lifecycle events to the browser via Server-Sent Events.
 * The runner emits events through lib/extractionJobEvents.ts; this route subscribes
 * and forwards them to the connected client.
 */

import { type NextRequest } from "next/server";
import {
  subscribeToExtractionJob,
  unsubscribeFromExtractionJob,
  type ExtractionJobEvent,
} from "@/lib/extractionJobEvents";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  if (!jobId?.trim()) {
    return new Response("Invalid extraction job ID.", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      function send(event: ExtractionJobEvent) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Controller may already be closed if the client disconnected.
        }
      }

      let closed = false;
      function cleanup() {
        if (closed) return;
        closed = true;
        clearInterval(heartbeatInterval);
        unsubscribeFromExtractionJob(jobId, handler);
        try {
          controller.close();
        } catch {
          // Stream already closed.
        }
      }

      function handler(event: ExtractionJobEvent) {
        send(event);
        if (event.type === "stopped" || event.type === "completed") {
          cleanup();
        }
      }

      subscribeToExtractionJob(jobId, handler);

      const heartbeatInterval = setInterval(() => {
        send({ type: "heartbeat" });
      }, 60_000);

      request.signal.addEventListener("abort", cleanup);

      void (async () => {
        try {
          const job = await prisma.extractionJob.findUnique({ where: { id: jobId } });

          if (!job) {
            handler({
              type: "completed",
              jobPatch: {
                isRunning: false,
                successfulResultCount: 0,
                failedResultCount: 0,
                totalInputCount: 0,
                totalProcessingTimeSeconds: 0,
                currentInputLabel: null,
              },
            });
            return;
          }

          const [successfulResultCount, failedResultCount, totalInputCount] = await Promise.all([
            prisma.extractionResult.count({ where: { extractionJobId: jobId, status: "success" } }),
            prisma.extractionResult.count({ where: { extractionJobId: jobId, status: "failed" } }),
            prisma.datasetInput.count({ where: { datasetId: job.datasetId } }),
          ]);

          if (job.finishedAt != null) {
            handler({
              type: "completed",
              jobPatch: {
                isRunning: false,
                startedAt: job.startedAt?.toISOString() ?? null,
                finishedAt: job.finishedAt.toISOString(),
                currentInputLabel: null,
                successfulResultCount,
                failedResultCount,
                totalInputCount,
                totalProcessingTimeSeconds: job.totalProcessingTimeSeconds,
              },
            });
          } else if (job.isRunning) {
            handler({
              type: job.currentInputLabel ? "processing" : "started",
              jobPatch: {
                isRunning: true,
                startedAt: job.startedAt?.toISOString() ?? null,
                finishedAt: null,
                currentInputLabel: job.currentInputLabel,
                successfulResultCount,
                failedResultCount,
                totalInputCount,
                totalProcessingTimeSeconds: job.totalProcessingTimeSeconds,
              },
            });
          }
        } catch {
          // Non-fatal: keep the stream open and rely on heartbeat/client reconnect.
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
