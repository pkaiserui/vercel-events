"use client";

import { useState, useEffect, useRef } from "react";

type ProcessedLog = {
  expression: string;
  result: number;
  userId?: string;
  submittedAt?: string;
  processedAt?: string;
};

const MAX_PROCESSED_LOGS = 50;

export default function Home() {
  const [expression, setExpression] = useState("");
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [processOneStatus, setProcessOneStatus] = useState<"idle" | "loading" | "success" | "empty" | "error">("idle");
  const [lastProcessed, setLastProcessed] = useState<ProcessedLog | null>(null);
  const [processedLogs, setProcessedLogs] = useState<ProcessedLog[]>([]);
  const [autoProcess, setAutoProcess] = useState(false);
  const autoProcessRef = useRef<NodeJS.Timeout | null>(null);
  const [randomPostStatus, setRandomPostStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [randomPostMessage, setRandomPostMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!expression.trim()) return;
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/queue/math", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expression: expression.trim(),
          userId: userId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Request failed");
        return;
      }
      setStatus("success");
      const parts = [`Queued: "${data.expression}" (messageId: ${data.messageId})`];
      if (data.userId) parts.push(`user: ${data.userId}`);
      if (data.submittedAt) parts.push(`submitted: ${data.submittedAt}`);
      setMessage(parts.join(" · "));
      setExpression("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Network error");
    }
  }

  async function handleCreateRandom() {
    setRandomPostStatus("loading");
    setRandomPostMessage(null);
    try {
      const res = await fetch("/api/queue/random", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 10 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRandomPostStatus("error");
        setRandomPostMessage(data.error ?? "Failed");
        return;
      }
      setRandomPostStatus("success");
      setRandomPostMessage(`Queued ${data.queued} random expressions.`);
    } catch {
      setRandomPostStatus("error");
      setRandomPostMessage("Request failed");
    }
  }

  function appendProcessedLog(log: ProcessedLog) {
    setProcessedLogs((prev) => [log, ...prev].slice(0, MAX_PROCESSED_LOGS));
  }

  async function processOne(): Promise<boolean> {
    try {
      const res = await fetch("/api/process-one", { method: "POST" });
      const data = await res.json();
      if (!res.ok) return false;
      if (data.reason === "empty") return false;
      if (data.processed && data.expression != null && data.result != null) {
        const log: ProcessedLog = {
          expression: data.expression,
          result: data.result,
          userId: data.userId,
          submittedAt: data.submittedAt,
          processedAt: data.processedAt,
        };
        setLastProcessed(log);
        appendProcessedLog(log);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function handleProcessOne() {
    setProcessOneStatus("loading");
    setLastProcessed(null);
    try {
      const gotOne = await processOne();
      setProcessOneStatus(gotOne ? "success" : "empty");
    } catch {
      setProcessOneStatus("error");
    }
  }

  useEffect(() => {
    if (!autoProcess) {
      if (autoProcessRef.current) {
        clearInterval(autoProcessRef.current);
        autoProcessRef.current = null;
      }
      return;
    }
    const run = async () => {
      await processOne();
    };
    run();
    autoProcessRef.current = setInterval(run, 2000);
    return () => {
      if (autoProcessRef.current) {
        clearInterval(autoProcessRef.current);
        autoProcessRef.current = null;
      }
    };
  }, [autoProcess]);

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
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Username (optional, default: anonymous)"
            disabled={status === "loading"}
            style={{
              width: "100%",
              marginBottom: "0.5rem",
              padding: "0.5rem 0.75rem",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text)",
              fontFamily: "inherit",
              fontSize: "0.9rem",
            }}
          />
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
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

      <div style={{ marginTop: "0.75rem" }}>
        <button
          type="button"
          onClick={handleCreateRandom}
          disabled={randomPostStatus === "loading"}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.9rem",
            background: randomPostStatus === "loading" ? "var(--muted)" : "transparent",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontWeight: 600,
            cursor: randomPostStatus === "loading" ? "not-allowed" : "pointer",
          }}
        >
          {randomPostStatus === "loading" ? "Creating…" : "Create 10 random posts"}
        </button>
        {randomPostMessage && (
          <span style={{ marginLeft: "0.5rem", fontSize: "0.85rem", color: "var(--muted)" }}>
            {randomPostMessage}
          </span>
        )}
      </div>

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
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem", fontSize: "0.9rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={autoProcess}
            onChange={(e) => setAutoProcess(e.target.checked)}
          />
          Auto-process (poll every 2s when queue has messages)
        </label>
        {processOneStatus === "empty" && (
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.5rem", marginBottom: 0 }}>
            No message in the queue. Queue an expression above first.
          </p>
        )}
        {lastProcessed && (
          <div style={{ fontSize: "0.9rem", marginTop: "0.75rem" }}>
            <p style={{ margin: 0 }}>
              Last processed: <code>{lastProcessed.expression}</code> → <strong>{lastProcessed.result}</strong>
            </p>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "var(--muted)" }}>
              {lastProcessed.userId && <>Username: {lastProcessed.userId}</>}
              {lastProcessed.userId && (lastProcessed.submittedAt || lastProcessed.processedAt) && " · "}
              {lastProcessed.submittedAt && <>Submitted: {lastProcessed.submittedAt}</>}
              {lastProcessed.submittedAt && lastProcessed.processedAt && " · "}
              {lastProcessed.processedAt && <>Processed: {lastProcessed.processedAt}</>}
            </p>
          </div>
        )}
      </section>

      <section
        style={{
          marginTop: "1.5rem",
          padding: "1.25rem",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
        }}
      >
        <h2 style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Processed logs
        </h2>
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
          Logs from processing in this session (manual or auto). Newest first. Max {MAX_PROCESSED_LOGS} entries.
        </p>
        {processedLogs.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: 0 }}>
            No processed logs yet. Process messages with the buttons above or turn on Auto-process.
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem", lineHeight: 1.9 }}>
            {processedLogs.map((log, i) => (
              <li key={i} style={{ color: "var(--muted)", marginBottom: "0.25rem" }}>
                <code>{log.expression}</code> → <strong>{log.result}</strong>
                {(log.userId || log.submittedAt || log.processedAt) && (
                  <span style={{ fontSize: "0.8rem", marginLeft: "0.35rem" }}>
                    {log.userId && <> · {log.userId}</>}
                    {log.submittedAt && <> · submitted {log.submittedAt}</>}
                    {log.processedAt && <> · processed {log.processedAt}</>}
                  </span>
                )}
              </li>
            ))}
          </ul>
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
