import type { Request, Response } from "express";

const TAVILY_API = "https://api.tavily.com";

type TavilyResult = { title: string; url: string; content?: string; score?: number };

async function postJSON(url: string, body: any, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "pitch-ai/1.0" },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    if (!r.ok) throw new Error(`${url} ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

async function tavilySearch(query: string, max = 8) {
  const data = await postJSON(`${TAVILY_API}/search`, {
    api_key: process.env.TAVILY_API_KEY,
    query,
    search_depth: "advanced",
    max_results: max,
    include_answer: false,
    include_raw_content: true,
  });
  return (data.results || []) as TavilyResult[];
}

async function tavilyExtract(url: string) {
  const data = await postJSON(`${TAVILY_API}/extract`, {
    api_key: process.env.TAVILY_API_KEY,
    url,
  });
  return String(data.content || "");
}


const ATS = ["myworkdayjobs.com","greenhouse.io","lever.co","ashbyhq.com","icims.com","smartrecruiters.com","taleo.net"];
function pickBestPosting(results: TavilyResult[], company: string, title: string): TavilyResult | null {
  const n = (s:string)=>s?.toLowerCase()||"";
  const c=n(company), t=n(title);
  const ats = results.filter(r =>
    ATS.some(d => r.url.includes(d)) && (n(r.title).includes(t) || n(r.url).includes(t.replace(/\s+/g,"-")))
  );
  if (ats[0]) return ats[0];
  const career = results.find(r => n(r.url).includes(c) && (n(r.url).includes("careers") || n(r.url).includes("jobs")));
  if (career) return career;
  return results.sort((a,b)=>(b.score??0)-(a.score??0))[0] || null;
}

export async function jobBrief(req: Request, res: Response) {
  try {
    const { company, title } = req.body ?? {};
    if (!process.env.TAVILY_API_KEY) return res.status(500).json({ error: "TAVILY_API_KEY missing" });
    if (!company || !title) return res.status(400).json({ error: "company and title required" });

    const companySlug = String(company).toLowerCase().replace(/[^a-z0-9]/g, "");
    const query =
      `${company} "${title}" (Workday OR Greenhouse OR Lever OR ` +
      `site:careers.${companySlug}.com OR site:jobs.${companySlug}.com)`;

    const results = await tavilySearch(query, 8);
    if (!results.length) return res.json({ notFound: true, sources: [] });

    const best = pickBestPosting(results, company, title) || results[0];
    const content = best.content?.trim() ? best.content! : await tavilyExtract(best.url);

    const summary = content.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,5).join(" ");

    return res.json({
      company, title,
      postingUrl: best.url,
      summary,
      raw: content.slice(0, 120000),
      sources: results.slice(0, 3).map(r => ({ title: r.title, url: r.url })),
    });
  } catch (e:any) {
    return res.status(500).json({ error: e.message || "job-brief failed" });
  }
}
