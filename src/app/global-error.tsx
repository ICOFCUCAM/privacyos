"use client";

// Root error boundary — must render its own <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ background: "#0a0b0f", color: "#e2e8f0", fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>MyPrivacyOS hit a critical error.</h1>
          <p style={{ marginTop: 8, color: "#94a3b8" }}>Please retry. The issue has been logged.</p>
          {error.digest && <p style={{ marginTop: 8, fontSize: 12, color: "#475569" }}>Ref: {error.digest}</p>}
          <button
            onClick={reset}
            style={{ marginTop: 24, borderRadius: 8, background: "#6366f1", color: "#fff", border: 0, padding: "10px 20px", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
