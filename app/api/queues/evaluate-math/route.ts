import { handleCallback } from "@vercel/queue";
import { Parser } from "expr-eval";

type MathMessage = { expression: string; createdAt?: string };

function safeEvaluate(expression: string): number {
  return Parser.evaluate(expression, {});
}

export const POST = handleCallback(async (message: MathMessage, metadata) => {
  const { expression } = message;
  if (!expression || typeof expression !== "string") {
    throw new Error("Invalid message: missing or invalid expression");
  }

  try {
    const result = safeEvaluate(expression);
    console.log(
      `[evaluate-math] messageId=${metadata.messageId} expression="${expression}" result=${result}`
    );
    // In a real app you might store the result in a DB or send a webhook.
  } catch (err) {
    // Invalid expression (e.g. "2++"); rethrow so Vercel can retry or DLQ
    console.error(`[evaluate-math] messageId=${metadata.messageId} expression="${expression}" error:`, err);
    throw err;
  }
});
