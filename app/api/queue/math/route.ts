import { QueueClient } from "@vercel/queue";
import { NextResponse } from "next/server";

const MATH_TOPIC = "math-eval";

const queue = new QueueClient({
  region: process.env.QUEUE_REGION ?? process.env.VERCEL_REGION ?? "iad1",
});

/**
 * Producer: enqueues a math expression. Does not call the consumer.
 * If the consumer is down, this still succeeds; messages are stored and
 * delivered when the consumer is back.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const expression = typeof body?.expression === "string" ? body.expression.trim() : null;

    if (!expression) {
      return NextResponse.json(
        { error: "Missing or invalid 'expression' in body" },
        { status: 400 }
      );
    }

    const { messageId } = await queue.send(
      MATH_TOPIC,
      { expression, createdAt: new Date().toISOString() },
      { retentionSeconds: 86400 }
    );

    return NextResponse.json({
      messageId,
      expression,
      status: "queued",
      note: "Expression will be evaluated by the consumer when it runs (even if the service was down).",
    });
  } catch (error) {
    console.error("[queue/math] send failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to queue message" },
      { status: 500 }
    );
  }
}
