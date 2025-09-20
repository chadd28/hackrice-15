const BASE =
  (import.meta.env.VITE_BACKEND_URL || "http://localhost:3000").replace(/\/+$/, "");
const ENDPOINT = `${BASE}/api/tech-answer`;

export interface TechAnswerResponse {
  question: string;
  answer?: {
    explanation: string;
    code: string | null;
  };
  sourceUrl?: string;
  sources?: { title?: string; url: string }[];
  notFound?: boolean;
  error?: string;
}

async function postJSON<T = any>(url: string, body: any, timeout = 15000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data as T;
  } finally {
    clearTimeout(t);
  }
}

export const techAnswerService = {
  fetchAnswer: (question: string) =>
    postJSON<TechAnswerResponse>(ENDPOINT, { question: question.trim() }),
};