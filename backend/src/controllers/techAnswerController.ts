// controllers/techAnswerController.ts   (patched)
import type { Request, Response } from "express";
const TAVILY_API = "https://api.tavily.com";

type TavilyResult = { title?: string; url?: string; content?: string; score?: number };

async function postJSON<T>(url: string, body: unknown, timeoutMs = 12_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "pitch-ai/1.0" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`${url} ${r.status}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function tavilySearch(q: string, max = 6, wantAnswer = true): Promise<{ answer?: string; results: TavilyResult[] }> {
  type Res = { answer?: string; results?: TavilyResult[] };
  const data = await postJSON<Res>(`${TAVILY_API}/search`, {
    api_key: process.env.TAVILY_API_KEY,
    query: q,
    search_depth: "advanced",
    include_raw_content: true,
    include_answer: wantAnswer,          //  ← turned on
    max_results: max,
  });
  return { answer: data.answer, results: data.results ?? [] };
}

async function tavilyExtract(url: string): Promise<string> {
  type Res = { content?: string };
  const d = await postJSON<Res>(`${TAVILY_API}/extract`, { api_key: process.env.TAVILY_API_KEY, url });
  return String(d.content ?? "");
}

// --- ranking helpers -------------------------------------------------------

const GOOD_DOMAINS = ["leetcode.com", "geeksforgeeks.org", "stackoverflow.com", "github.com"] as const;

function hasCode(raw: string) {
  return /```[\s\S]{10,}```|~~~[\s\S]{10,}~~~/.test(raw);
}

function pickBest(results: TavilyResult[], normQ: string): TavilyResult | null {
  // 1) trusted domain *and* code block
  const best = results.find(
    (r) => r.url && GOOD_DOMAINS.some((d) => r.url!.includes(d)) && r.content && hasCode(r.content),
  );
  if (best) return best;

  // 2) trusted domain
  const trusted = results.find((r) => r.url && GOOD_DOMAINS.some((d) => r.url!.includes(d)));
  if (trusted) return trusted;

  // 3) highest score
  return results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] ?? null;
}

function splitExplainAndCode(raw: string) {
  const codeMatch = raw.match(/```[\s\S]*?```|~~~[\s\S]*?~~~/);
  const code = codeMatch?.[0] ?? null;
  const before = codeMatch ? raw.slice(0, codeMatch.index) : raw;

  const explanation = before
    .replace(/^>.*$/gm, "")                 // strip quoted “> Input:” lines
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ")
    .split(/\. (?=[A-Z])/)
    .slice(0, 3)                           // first 3 sentences max
    .join(". ") + ".";

  return { explanation: explanation.trim(), code };
}

// --- controller ------------------------------------------------------------

export async function techAnswer(req: Request, res: Response) {
  try {
    const { question } = req.body ?? {};
    if (!process.env.TAVILY_API_KEY) return res.status(500).json({ error: "TAVILY_API_KEY missing" });
    if (!question) return res.status(400).json({ error: "question required" });

    const norm = String(question).trim();
    const { answer: tavilyAnswer, results } = await tavilySearch(`${norm} solution`, 6);

    if (!results.length) return res.json({ notFound: true, sources: [] });

    const best = pickBest(results, norm.toLowerCase()) ?? results[0];
    if (!best?.url) return res.json({ notFound: true, sources: [] });

    const raw = best.content?.trim() || (await tavilyExtract(best.url));
    const { explanation, code } = splitExplainAndCode(raw);

    return res.json({
      question: norm,
      answer: {
        explanation: tavilyAnswer?.trim() || explanation,
        code,
      },
      sourceUrl: best.url,
      sources: results.slice(0, 3).map(({ title, url }) => ({ title, url })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "tech-answer failed" });
  }
}