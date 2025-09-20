const BASE =
  (import.meta.env.VITE_BACKEND_URL ?? "").replace(/\/+$/, "") ||
  "http://localhost:3000";                 // ← built-in fallback

const ENDPOINT = `${BASE}/api/tavily/job-brief`;

console.log("jobBriefService BASE =", BASE);
console.log("jobBriefService ENDPOINT =", ENDPOINT);

export const jobBriefService = {
  fetchBrief: async (company: string, title: string): Promise<JobBriefResponse> => {
    try {
      const data = await postJSON(ENDPOINT, { company: company.trim(), title: title.trim() });
      return { ...(data as JobBriefResponse), _endpointTried: ENDPOINT };
    } catch (e: any) {
      // surfacing server-side message is still useful
      throw new Error(e?.message || "Request failed");
    }
  },
};

export type JobBriefResponse = {
  company: string;
  title: string;
  postingUrl?: string;
  summary?: string;
  raw?: string;
  sources?: { title?: string; url: string }[];
  notFound?: boolean;
  error?: string;
  _endpointTried?: string; // handy for debugging
};

async function postJSON(url: string, body: any, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data && data.error) ? data.error : `HTTP ${res.status}`;
      const err: any = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(t);
  }
}