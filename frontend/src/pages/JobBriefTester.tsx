import { useState } from "react";
import { jobBriefService, type JobBriefResponse } from "../services/jobBriefService";

export default function JobBriefTester() {
  const [company, setCompany] = useState("Garmin");
  const [title, setTitle] = useState("Software Engineering Intern");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<JobBriefResponse | null>(null);
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setData(null);
    try {
      const out = await jobBriefService.fetchBrief(company.trim(), title.trim());
      setData(out);
    } catch (e: any) {
      setError(e?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 960, margin: "32px auto", fontFamily: "system-ui" }}>
      <h1>Job Brief Tester</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr", maxWidth: 720 }}>
        <input value={company} onChange={e=>setCompany(e.target.value)} placeholder="Company" />
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Job Title" />
        <button type="submit" disabled={loading} style={{ gridColumn: "1 / span 2" }}>
          {loading ? "Fetching…" : "Fetch job brief"}
        </button>
      </form>

      {error && <p style={{ color: "crimson", marginTop: 12 }}>Error: {error}</p>}

      {data && (
        <section style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Endpoint: <code>{data._endpointTried}</code>
          </div>
          {data.notFound ? (
            <p>No posting found.</p>
          ) : (
            <>
              <h3 style={{ margin: "8px 0" }}>{data.title} @ {data.company}</h3>
              {data.postingUrl && <p><a href={data.postingUrl} target="_blank" rel="noreferrer">View posting</a></p>}
              {data.summary && <p style={{ whiteSpace: "pre-wrap" }}>{data.summary}</p>}
              {!!data.sources?.length && (
                <>
                  <h4>Sources</h4>
                  <ul>
                    {data.sources.map((s, i) => (
                      <li key={i}><a href={s.url} target="_blank" rel="noreferrer">{s.title || s.url}</a></li>
                    ))}
                  </ul>
                </>
              )}
              <details style={{ marginTop: 8 }}>
                <summary>Raw (first ~4k chars)</summary>
                <pre style={{ background:"#f6f6f6", padding:12, whiteSpace:"pre-wrap" }}>
                  {data.raw?.slice(0, 4000)}
                </pre>
              </details>
            </>
          )}
        </section>
      )}
    </main>
  );
}