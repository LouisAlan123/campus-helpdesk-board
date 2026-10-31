"use client";

import { useEffect, useState } from "react";

type HelpRequest = {
  id: number;
  student_name: string;
  message: string;
  resolved: boolean;
  created_at: string;
};

export default function Home() {
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [source, setSource] = useState<"PostgreSQL" | "Redis" | null>(null);
  const [views, setViews] = useState<number | null>(null);
  const [studentName, setStudentName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadRequests() {
    const res = await fetch("/api/requests");
    const data = await res.json();
    setSource(data.source);
    setRequests(data.requests);
  }

  async function bumpViews() {
    const res = await fetch("/api/views", { method: "POST" });
    const data = await res.json();
    setViews(data.views);
  }

  useEffect(() => {
    loadRequests();
    bumpViews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!studentName.trim() || !message.trim()) {
      setError("Name and request message are both required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_name: studentName, message }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      setStudentName("");
      setMessage("");
      await loadRequests();
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(id: number) {
    await fetch(`/api/requests/${id}/resolve`, { method: "POST" });
    await loadRequests();
  }

  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "2rem 1rem",
      }}
    >
      <h1>Campus Help Desk Board</h1>
      <p style={{ color: "#555" }}>Board views: {views ?? "…"}</p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          padding: "1rem",
          border: "1px solid #ddd",
          borderRadius: 8,
        }}
      >
        <label>
          Student name
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", marginTop: 4 }}
          />
        </label>
        <label>
          Help request
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: "0.5rem", marginTop: 4 }}
          />
        </label>
        {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: "0.5rem" }}>
          {loading ? "Posting…" : "Post Request"}
        </button>
      </form>

      <h2>
        Latest requests{" "}
        {source && (
          <span style={{ fontSize: "0.9rem", color: "#888" }}>
            (source: {source})
          </span>
        )}
      </h2>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {requests.map((r) => (
          <li
            key={r.id}
            style={{
              border: "1px solid #eee",
              borderRadius: 8,
              padding: "0.75rem 1rem",
              marginBottom: "0.5rem",
              opacity: r.resolved ? 0.5 : 1,
            }}
          >
            <strong>{r.student_name}</strong>
            {r.resolved && (
              <span style={{ marginLeft: 8, fontSize: "0.8rem" }}>
                (resolved)
              </span>
            )}
            <p style={{ margin: "0.25rem 0" }}>{r.message}</p>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <small style={{ color: "#999" }}>
                {new Date(r.created_at).toLocaleString()}
              </small>
              {!r.resolved && (
                <button onClick={() => handleResolve(r.id)}>Resolve</button>
              )}
            </div>
          </li>
        ))}
        {requests.length === 0 && <p>No requests yet.</p>}
      </ul>
    </main>
  );
}
