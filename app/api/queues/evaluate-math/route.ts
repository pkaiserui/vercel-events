import { QueueClient } from "@vercel/queue";
import { safeEvaluate } from "@/lib/math-eval";

type MathMessage = {
  expression: string;
  userId?: string | null;
  submittedAt?: string;
  createdAt?: string;
};

const queue = new QueueClient({
  region: process.env.QUEUE_REGION ?? process.env.VERCEL_REGION ?? "iad1",
});

export const POST = queue.handleCallback(async (message: MathMessage, metadata) => {
  const { expression, userId, submittedAt } = message;
  if (!expression || typeof expression !== "string") {
    throw new Error("Invalid message: missing or invalid expression");
  }

  const result = safeEvaluate(expression);
  console.log(
    `[evaluate-math] messageId=${metadata.messageId} expression="${expression}" result=${result}` +
      (userId != null ? ` userId=${userId}` : "") +
      (submittedAt ? ` submittedAt=${submittedAt}` : "")
  );
});
