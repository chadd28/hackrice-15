// // services/jobBriefService.ts
// const BASE = (import.meta.env.VITE_BACKEND_URL ?? "").replace(/\/+$/, "") ||
//              location.origin.replace(/\/+$/, "");   // falls back to same host

// // One canonical endpoint
// const ENDPOINT = `${BASE}/api/job-brief`;

// const BASE =
//   (import.meta.env.VITE_BACKEND_URL || "http://localhost:3000").replace(/\/+$/, "");

// export const ENDPOINT = `${BASE}/api/job-brief`;   // <-- note the slash before api

const BASE =
  (import.meta.env.VITE_BACKEND_URL ?? "").replace(/\/+$/, "") ||
  "http://localhost:3000";                 // ← built-in fallback

const ENDPOINT = `${BASE}/api/job-brief`;

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

async function postJSON(url: string, body: any, timeoutMs = 15000) {
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

// export const jobBriefService = {
//   /**
//    * Tries multiple endpoints so your frontend works no matter which mount/route style the backend uses.
//    */
//   fetchBrief: async (company: string, title: string): Promise<JobBriefResponse> => {
//     let lastErr: any = null;
//     for (const ep of ENDPOINTS) {
//       try {
//         const data = await postJSON(ep, { company, title });
//         return { ...(data as JobBriefResponse), _endpointTried: ep };
//       } catch (e: any) {
//         // only fall back on 404/405; otherwise bubble up (e.g., 500 key missing)
//         if (e?.status === 404 || e?.status === 405) {
//           lastErr = e;
//           continue;
//         }
//         throw e;
//       }
//     }
//     throw lastErr || new Error("All job-brief endpoints failed");
//   },
// };