# Vercel Queues – Math Eval Demo

A small demo that uses [Vercel Queues](https://vercel.com/docs/queues) to **post math expressions** to a topic and have a **consumer** evaluate them when it runs—even if the consumer was down when you submitted.

## What it does

- **Producer** (`POST /api/queue/math`): Accepts `{ "expression": "2 + 3 * 4" }` and publishes to the `math-eval` topic.
- **Consumer** (`app/api/queues/evaluate-math/route.ts`): Triggered by Vercel when messages arrive; evaluates the expression with [expr-eval](https://www.npmjs.com/package/expr-eval) and logs the result.

Messages are stored durably. If the consumer is unavailable (e.g. during a redeploy or outage), they stay in the queue and are processed when the consumer is back.

## Prerequisites

- Node.js 22+
- [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
- A Vercel account with **Vercel Queues** enabled

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Link the project and pull env (for local dev)**

   ```bash
   vercel link
   vercel env pull
   ```

   This creates `.env.local` with OIDC tokens so the Queue SDK can authenticate locally. On Vercel, auth is automatic.

3. **Run locally**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), submit an expression (e.g. `2 + 3 * 4`), and check the terminal or Vercel dashboard for the consumer log.

## Testing “queue when service is down”

1. Deploy: `vercel`
2. Submit a few expressions from the UI or with `curl` (see below).
3. Redeploy or temporarily remove the consumer (e.g. comment out the trigger in `vercel.json`) so the consumer is not running.
4. Submit more expressions—they are accepted and stored in the topic.
5. Restore the consumer and redeploy; it will process all pending messages. Check **Vercel → Project → Logs** (or function logs) for `[evaluate-math]` output.

## API

**Queue a math expression**

```bash
curl -X POST https://your-project.vercel.app/api/queue/math \
  -H "Content-Type: application/json" \
  -d '{"expression": "2 + 3 * 4"}'
```

Response:

```json
{
  "messageId": "...",
  "expression": "2 + 3 * 4",
  "status": "queued",
  "note": "Expression will be evaluated by the consumer when it runs (even if the service was down)."
}
```

The consumer logs something like:

`[evaluate-math] messageId=... expression="2 + 3 * 4" result=14`

## Project layout

- `app/page.tsx` – UI to submit expressions
- `app/api/queue/math/route.ts` – producer (sends to topic `math-eval`)
- `app/api/queues/evaluate-math/route.ts` – consumer (evaluates and logs)
- `vercel.json` – wires the consumer to the `math-eval` topic via `queue/v2beta` trigger

## References

- [Vercel Queues](https://vercel.com/docs/queues)
- [Queues Quickstart](https://vercel.com/docs/queues/quickstart)
- [Queues SDK](https://vercel.com/docs/queues/sdk)
