import { useState } from "react";
import { techAnswerService, TechAnswerResponse } from "../services/techAnswerService";

export default function TechAnswerTester() {
  const [q, setQ] = useState("Two Sum");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TechAnswerResponse | null>(null);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    setData(null);
    try {
      const out = await techAnswerService.fetchAnswer(q);
      setData(out);
    } catch (e: any) {
      setErr(e?.message || "request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 960, margin: "32px auto", fontFamily: "system-ui" }}>
      <h1>Tech Answer Tester</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1 }}
          placeholder="Enter interview question"
        />
        <button disabled={loading}>{loading ? "Fetching…" : "Fetch"}</button>
      </form>

      {err && <p style={{ color: "crimson" }}>Error: {err}</p>}

      {data && (
        <section style={{ marginTop: 24 }}>
          {data.notFound ? (
            <p>No answer found.</p>
          ) : (
            <>
              <h3>{data.question}</h3>
              <p style={{ whiteSpace: "pre-wrap" }}>{data.answer?.explanation}</p>
              {data.answer?.code && (
                <pre style={{ background: "#f6f6f6", padding: 12, overflowX: "auto" }}>
                  {data.answer.code}
                </pre>
              )}
              {data.sourceUrl && (
                <p>
                  Source:{" "}
                  <a href={data.sourceUrl} target="_blank" rel="noreferrer">
                    {data.sourceUrl}
                  </a>
                </p>
              )}
              {!!data.sources?.length && (
                <>
                  <h4>Other sources</h4>
                  <ul>
                    {data.sources.map((s, i) => (
                      <li key={i}>
                        <a href={s.url} target="_blank" rel="noreferrer">
                          {s.title || s.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}