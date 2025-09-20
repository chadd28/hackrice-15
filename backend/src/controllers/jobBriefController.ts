import type { Request, Response } from "express";

/* ------------------------------------------------------------------ */
/*  Config & helpers                                                  */
/* ------------------------------------------------------------------ */
const TAVILY_API = "https://api.tavily.com";
const ATS = [
  "myworkdayjobs.com",
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "icims.com",
  "smartrecruiters.com",
  "taleo.net",
] as const;

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
};

async function postJSON<T>(url: string, body: unknown, timeoutMs = 12_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "pitch-ai/1.0",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`${url} ${r.status}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/*  Tavily wrappers                                                   */
/* ------------------------------------------------------------------ */
async function tavilySearch(query: string, maxResults = 8): Promise<TavilyResult[]> {
  type SearchResponse = { results?: TavilyResult[] };
  const data = await postJSON<SearchResponse>(`${TAVILY_API}/search`, {
    api_key: process.env.TAVILY_API_KEY,
    query,
    search_depth: "advanced",
    max_results: maxResults,
    include_answer: false,
    include_raw_content: true,
  });
  return data.results ?? [];
}

async function tavilyExtract(url: string): Promise<string> {
  type ExtractResponse = { content?: string };
  const data = await postJSON<ExtractResponse>(`${TAVILY_API}/extract`, {
    api_key: process.env.TAVILY_API_KEY,
    url,
  });
  return String(data.content ?? "");
}

/* ------------------------------------------------------------------ */
/*  Ranking logic                                                     */
/* ------------------------------------------------------------------ */
function pickBestPosting(
  results: TavilyResult[],
  company: string,
  title: string,
): TavilyResult | null {
  const lc = (s?: string) => s?.toLowerCase() ?? "";
  const c = lc(company);
  const t = lc(title);

  // 1) ATS-hosted postings that match title
  const atsHits = results.filter(
    (r) =>
      r.url &&
      ATS.some((d) => r.url!.includes(d)) &&
      (lc(r.title).includes(t) || lc(r.url).includes(t.replace(/\s+/g, "-"))),
  );
  if (atsHits[0]) return atsHits[0];

  // 2) Careers/jobs page on the company’s own domain
  const careerHit = results.find(
    (r) =>
      r.url &&
      lc(r.url).includes(c) &&
      (lc(r.url).includes("careers") || lc(r.url).includes("jobs")),
  );
  if (careerHit) return careerHit;

  // 3) Fallback: highest score
  return results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] ?? null;
}

/* ------------------------------------------------------------------ */
/*  Controller                                                        */
/* ------------------------------------------------------------------ */
export async function jobBrief(req: Request, res: Response) {
  try {
    const { company, title } = req.body ?? {};
    if (!process.env.TAVILY_API_KEY) {
      return res.status(500).json({ error: "TAVILY_API_KEY missing" });
    }
    if (!company || !title) {
      return res.status(400).json({ error: "company and title required" });
    }

    const companySlug = String(company).toLowerCase().replace(/[^a-z0-9]/g, "");
    const query =
      `${company} "${title}" (Workday OR Greenhouse OR Lever OR ` +
      `site:careers.${companySlug}.com OR site:jobs.${companySlug}.com)`;

    const results = await tavilySearch(query, 8);
    if (results.length === 0) return res.json({ notFound: true, sources: [] });

    const best = pickBestPosting(results, company, title) ?? results[0];
    if (!best?.url) return res.json({ notFound: true, sources: [] });

    const rawContent =
      best.content?.trim().length ? best.content! : await tavilyExtract(best.url);

    const summary = rawContent
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5)
      .join(" ");

    return res.json({
      company,
      title,
      postingUrl: best.url,
      summary,
      raw: rawContent.slice(0, 120_000),
      sources: results.slice(0, 3).map(({ title, url }) => ({ title, url })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "job-brief failed" });
  }
}