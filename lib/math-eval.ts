import { Parser } from "expr-eval";

export function safeEvaluate(expression: string): number {
  return Parser.evaluate(expression, {});
}
