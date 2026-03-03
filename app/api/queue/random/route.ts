import { QueueClient } from "@vercel/queue";
import { NextResponse } from "next/server";

const MATH_TOPIC = "math-eval";
const DEFAULT_COUNT = 10;
const MAX_COUNT = 100;

const queue = new QueueClient({
  region: process.env.QUEUE_REGION ?? process.env.VERCEL_REGION ?? "iad1",
});

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomExpression(): string {
  const a = randomInt(1, 20);
  const b = randomInt(1, 20);
  const ops = ["+", "-", "*"] as const;
  const op = ops[randomInt(0, ops.length - 1)];
  return `${a} ${op} ${b}`;
}

/**
 * POST with body { count?: number } to enqueue that many random math expressions.
 * Default count is 10, max 100.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const count = Math.min(
      Math.max(1, Number(body?.count) || DEFAULT_COUNT),
      MAX_COUNT
    );

    const results: { expression: string; messageId: string | null }[] = [];

    for (let i = 0; i < count; i++) {
      const expression = randomExpression();
      const submittedAt = new Date().toISOString();
      const userId = "random";
      const { messageId } = await queue.send(
        MATH_TOPIC,
        { expression, userId, submittedAt },
        { retentionSeconds: 86400 }
      );
      results.push({ expression, messageId });
    }

    return NextResponse.json({
      queued: count,
      results,
    });
  } catch (error) {
    console.error("[queue/random] send failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to queue messages" },
      { status: 500 }
    );
  }
}
