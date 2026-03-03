"use client";

import { useState } from "react";

export default function Home() {
  const [expression, setExpression] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [processOneStatus, setProcessOneStatus] = useState<"idle" | "loading" | "success" | "empty" | "error">("idle");
  const [lastProcessed, setLastProcessed] = useState<{ expression: string; result: number } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!expression.trim()) return;
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/queue/math", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expression: expression.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Request failed");
        return;
      }
      setStatus("success");
      setMessage(`Queued: "${data.expression}" (messageId: ${data.messageId})`);
      setExpression("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Network error");
    }
  }

  async function handleProcessOne() {
    setProcessOneStatus("loading");
    setLastProcessed(null);
    try {
      const res = await fetch("/api/process-one", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setProcessOneStatus("error");
        return;
      }
      if (data.reason === "empty") {
        setProcessOneStatus("empty");
      } else {
        setProcessOneStatus("success");
        if (data.processed && data.expression != null && data.result != null) {
          setLastProcessed({ expression: data.expression, result: data.result });
        }
      }
    } catch {
      setProcessOneStatus("error");
    }
  }

  return (
    <main
      style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: "3rem 1.5rem",
      }}
    >
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 600,
          marginBottom: "0.5rem",
          letterSpacing: "-0.02em",
        }}
      >
        Vercel Queues – Math Eval
      </h1>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.9rem",
          marginBottom: "2rem",
        }}
      >
        Post a math expression to the queue. The consumer will evaluate it when it runs, even if the
        service was down when you submitted. Uses{" "}
        <a href="https://vercel.com/changelog/vercel-queues-now-in-public-beta" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
          Vercel Queues
        </a>{" "}
        only (no KV).
      </p>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <input
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="e.g. 2 + 3 * 4"
            disabled={status === "loading"}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text)",
              fontFamily: "inherit",
              fontSize: "1rem",
            }}
            autoFocus
          />
          <button
            type="submit"
            disabled={status === "loading" || !expression.trim()}
            style={{
              padding: "0.75rem 1.25rem",
              background: "var(--accent)",
              color: "var(--bg)",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              cursor: status === "loading" ? "not-allowed" : "pointer",
              opacity: status === "loading" || !expression.trim() ? 0.6 : 1,
            }}
          >
            {status === "loading" ? "Sending…" : "Queue"}
          </button>
        </div>
        {message && (
          <p
            style={{
              fontSize: "0.875rem",
              color: status === "error" ? "var(--error)" : "var(--muted)",
              margin: 0,
            }}
          >
            {message}
          </p>
        )}
      </form>

      <section
        style={{
          marginTop: "2rem",
          padding: "1.25rem",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
        }}
      >
        <h2 style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Consumer: process & eval one message
        </h2>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
          Pull one message from the <code>math-eval</code> topic and evaluate it. The consumer runs
          the expression and shows the result below.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleProcessOne}
            disabled={processOneStatus === "loading"}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
              background: processOneStatus === "loading" ? "var(--muted)" : "var(--accent)",
              color: "var(--bg)",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              cursor: processOneStatus === "loading" ? "not-allowed" : "pointer",
            }}
          >
            {processOneStatus === "loading" ? "Processing…" : "Process & eval one"}
          </button>
          <button
            type="button"
            onClick={handleProcessOne}
            disabled={processOneStatus === "loading"}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
              background: processOneStatus === "loading" ? "var(--muted)" : "transparent",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontWeight: 600,
              cursor: processOneStatus === "loading" ? "not-allowed" : "pointer",
            }}
          >
            Consumer: process log
          </button>
        </div>
        {processOneStatus === "empty" && (
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.5rem", marginBottom: 0 }}>
            No message in the queue. Queue an expression above first.
          </p>
        )}
        {lastProcessed && (
          <p style={{ fontSize: "0.9rem", marginTop: "0.75rem", marginBottom: 0 }}>
            Last processed: <code>{lastProcessed.expression}</code> → <strong>{lastProcessed.result}</strong>
          </p>
        )}
      </section>

      <section
        style={{
          marginTop: "2.5rem",
          padding: "1.25rem",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
        }}
      >
        <h2 style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          How to test “queue when service is down”
        </h2>
        <ul
          style={{
            margin: 0,
            paddingLeft: "1.25rem",
            color: "var(--muted)",
            fontSize: "0.85rem",
            lineHeight: 1.7,
          }}
        >
          <li>Submit expressions with the form above (they go to the <code>math-eval</code> topic).</li>
          <li>Redeploy or pause the project so the consumer is not running.</li>
          <li>Submit more expressions — they are stored durably by Vercel Queues.</li>
          <li>Redeploy or turn the project back on; the consumer will process all pending messages.</li>
          <li>Check Vercel function logs for <code>[evaluate-math]</code> output, or use “Process one message” to see a result in the UI.</li>
        </ul>
      </section>
    </main>
  );
}
