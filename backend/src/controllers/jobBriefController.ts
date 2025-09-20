import { html } from "cheerio/dist/commonjs/static";
import { raw, type Request, type Response } from "express";

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

function htmlToText(html: string): string {
  // remove <script> & <style> blocks first
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
             .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // strip all remaining tags
  const text = html.replace(/<\/?[^>]+>/g, " ");

  // decode a few common entities
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi,  "<")
    .replace(/&gt;/gi,  ">")
    .replace(/\s+/g,    " ")        // collapse whitespace
    .trim();
}

async function fetchAtsFullText(url: string): Promise<string | null> {
  try {
    const gh = url.match(/^https?:\/\/(?:job-boards|boards)\.greenhouse\.io\/([^/]+)\/jobs\/(\d+)/);
    if (gh) {
      const [, board, id] = gh;
      const api = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${id}?content=true`;
      const json: any = await fetch(api).then(r => r.json());
      return json?.content ?? null;
    }

    const lv = url.match(/^https?:\/\/jobs\.lever\.co\/([^/]+)\/([\w-]+)/);
    if (lv) {
      const [, company, slug] = lv;
      const api = `https://api.lever.co/v0/postings/${company}/${slug}?mode=json`;
      const json: any = await fetch(api).then(r => r.json());
      return json?.description ?? null;
    }
  } catch (e) {
    console.warn("ATS JSON fetch failed:", (e as Error).message);
  }
  return null;   // not an ATS url or network error
}

function isAtsForCompany(url: string, company: string): boolean {
  const u    = new URL(url);
  const host = u.hostname.toLowerCase();
  const c    = company.toLowerCase();

  // ─── Greenhouse ───
  if (host.endsWith(".greenhouse.io")) {
    const board = u.pathname.split("/")[1]?.toLowerCase();  // gusto
    return board === c;
  }

  // ─── Lever ───
  if (host === "jobs.lever.co") {
    const board = u.pathname.split("/")[1]?.toLowerCase();
    return board === c;
  }

  // Workday, AshbyHQ, iCIMS, SmartRecruiters, Taleo …
  return ATS.some(d => host.includes(d)) && host.includes(c);
}


function isCompanyCareer(url: string, company: string): boolean {
  const host = new URL(url).hostname.toLowerCase();
  const c    = company.toLowerCase();
  return host.includes(c) && (host.includes("careers") || host.includes("jobs"));
}

function allowedDomain(url: string, company: string): boolean {
  return isAtsForCompany(url, company) || isCompanyCareer(url, company);
}

/**
 * Extract only the “what you’ll do” + “what we’re looking for” sections.
 * If they’re not found, fall back to Responsibilities / Qualifications.
 */
function summarizePosting(raw: string): string {
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  /* ── DEBUG LOGS ────────────────────────────── */
  console.log(">>> summarizer invoked");
  console.log("raw first line:", lines[0]);            // ← produces “raw first line: …”

  // locate section headings
  const startIdx = lines.findIndex(l =>
    /here.?s what (you.?ll|you will) do/i.test(l)
  );
  const qualIdx = lines.findIndex(l =>
    /here.?s what we.?re looking for/i.test(l)
  );

  /* another debug line */
  console.log("startIdx", startIdx, "qualIdx", qualIdx); // ← prints the indices

  // if neither marker found, look for more generic headings
  const respIdx = lines.findIndex(l => /responsibilities/i.test(l));
  const reqIdx  = lines.findIndex(l => /(qualifications|requirements|skills)/i.test(l));

  // decide which blocks to keep
  let slice: string[] = [];
  if (startIdx !== -1) {
    // keep “what you’ll do” plus 12 lines below
    slice = slice.concat(lines.slice(startIdx, startIdx + 12));
  }
  if (qualIdx !== -1) {
    slice.push("");                                         // blank line between sections
    slice = slice.concat(lines.slice(qualIdx, qualIdx + 12));
  }

  // fallback if both custom markers missing
  if (!slice.length) {
    const s = respIdx !== -1 ? respIdx : 0;
    const e = reqIdx  !== -1 ? reqIdx  : s + 10;
    slice = lines.slice(s, e + 10);                        // ~20 lines total
  }

  return slice.join(" ").slice(0, 1500);                   // cap to ~1 ½ kB
}

function pickBestPosting(
  results: TavilyResult[],
  company: string,
  title: string,
): TavilyResult | null {
  const lc = (s?: string) => s?.toLowerCase() ?? "";
  const c  = lc(company);
  const t  = lc(title);

  const allowed = results.filter(r => r.url && allowedDomain(r.url, company));
  if (!allowed.length) return null;

  // 1) ATS hit whose title/slug matches the job title
  const ats = allowed.find(r =>
    isAtsForCompany(r.url!, company) &&
    (lc(r.title).includes(t) || lc(r.url).includes(t.replace(/\s+/g, "-")))
  );
  if (ats) return ats;

  // 2) careers page on company’s own domain
  const career = allowed.find(r => lc(r.url!).includes(c) &&
                                   (lc(r.url!).includes("careers") || lc(r.url!).includes("jobs")));
  if (career) return career;

  // 3) otherwise highest Tavily score among the remaining allowed
  return allowed.sort((a,b) => (b.score ?? 0) - (a.score ?? 0))[0] ?? null;
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

    const best = pickBestPosting(results, company, title);
    if (!best) return res.json({ notFound: true, sources: [] });

    let rawContent = best.content?.trim() || "";

    if (!rawContent || rawContent.length < 4000) {
      const atsFull = await fetchAtsFullText(best.url!);
      if (atsFull) rawContent = atsFull.trim();
    }

    // Otherwise fall back to Tavily /extract
    if (rawContent.length < 7000) {
      try {
        rawContent = await tavilyExtract(best.url!);
      } catch (e) {
        console.warn("Tavily extract failed:", (e as Error).message);
      } 
    }

    //rawContent = htmlToText(rawContent);

    // now run the summariser
    const summary = summarizePosting(rawContent);

    return res.json({
      company,
      title,
      postingUrl: best.url,
      summary,
      raw: rawContent.slice(0, 120_000),
      sources: results
        .filter(r => r.url && allowedDomain(r.url, company))
        .slice(0, 3)
        .map(({ title, url }) => ({ title, url })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "job-brief failed" });
  }
}