import { QueueClient } from "@vercel/queue";
import { NextResponse } from "next/server";
import { safeEvaluate } from "@/lib/math-eval";

const MATH_TOPIC = "math-eval";
const CONSUMER_GROUP = "default";

const queue = new QueueClient({
  region: process.env.QUEUE_REGION ?? process.env.VERCEL_REGION ?? "iad1",
});

type MathMessage = {
  expression: string;
  userId?: string | null;
  submittedAt?: string;
  createdAt?: string;
};

/**
 * Process one message from the topic (poll mode). Returns the evaluated result
 * in the response so the frontend can display it. Uses Vercel Queues only.
 */
export async function POST() {
  try {
    let processed: {
      expression: string;
      result: number;
      userId?: string | null;
      submittedAt?: string;
      processedAt: string;
    } | null = null;

    const result = await queue.receive<MathMessage>(
      MATH_TOPIC,
      CONSUMER_GROUP,
      async (message) => {
        const { expression, userId, submittedAt } = message;
        if (!expression || typeof expression !== "string") {
          throw new Error("Invalid message: missing or invalid expression");
        }
        const value = safeEvaluate(expression);
        processed = {
          expression,
          result: value,
          userId,
          submittedAt,
          processedAt: new Date().toISOString(),
        };
      },
      { limit: 1 }
    );

    if (result.ok && processed !== null) {
      const { expression, result: resultValue, userId, submittedAt, processedAt } = processed;
      return NextResponse.json({
        processed: true,
        expression,
        result: resultValue,
        userId: userId ?? undefined,
        submittedAt: submittedAt ?? undefined,
        processedAt,
      });
    }
    if (!result.ok && result.reason === "empty") {
      return NextResponse.json({ processed: false, reason: "empty" });
    }
    if (!result.ok) {
      return NextResponse.json({ processed: false, reason: result.reason }, { status: 200 });
    }
    return NextResponse.json({ processed: false }, { status: 200 });
  } catch (error) {
    console.error("[process-one] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process message" },
      { status: 500 }
    );
  }
}
