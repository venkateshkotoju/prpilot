// app/api/analyze-pr/route.ts
import { NextResponse } from "next/server";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini"; // change if you want another model

function buildPrompt(ghInfo: any) {
  const changed = (ghInfo.changedFiles || []).map((f:any) => {
    return `${f.filename} (${f.status}, changes: ${f.changes})\n${(f.patch||"").slice(0,1200)}`;
  }).slice(0, 8).join("\n\n---\n\n");

  return [
    { role: "system", content: "You are a helpful engineering assistant that outputs EXACT JSON with keys: summary (string), risks (array of strings), tests (array of strings), docsSnippet (string). Output ONLY valid JSON." },
    { role: "user", content:
`Given the following GitHub pull request information, produce:
1) summary (1-3 short sentences)
2) risks (3 short bullet points)
3) tests (3 suggested tests)
4) docsSnippet (a short changelog line)

Return EXACTLY JSON: {"summary":"...","risks":["..."],"tests":["..."],"docsSnippet":"..."}.

PR Title:
${ghInfo.prTitle || "<none>"}

PR Body:
${(ghInfo.prBody || "").slice(0,3000)}

Changed files (up to 8, patch truncated):
${changed}

Important: keep JSON compact and escape newlines properly.`
    }
  ];
}

async function callOpenAI(promptMessages: any[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: promptMessages,
      max_tokens: 800,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(()=>"<no body>");
    throw new Error(`OpenAI error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const assistant = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.text;
  return String(assistant || "");
}

async function fetchFromGitHub(owner: string, repo: string, prNumber: string, token?: string) {
  const headers: Record<string,string> = { "Accept": "application/vnd.github+json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, { headers });
  if (!prRes.ok) throw new Error(`GitHub PR fetch failed: ${prRes.status}`);
  const pr = await prRes.json();

  const filesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`, { headers });
  const files = filesRes.ok ? await filesRes.json() : [];

  const changedFiles = (files as any[]).slice(0, 12).map(f => ({
    filename: f.filename,
    status: f.status,
    changes: f.changes,
    patch: f.patch?.toString?.() ?? ""
  }));

  return {
    prTitle: pr.title,
    prBody: pr.body,
    author: pr.user?.login,
    changedFiles
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=>null);
    const repoUrl: string = body?.repoUrl ?? "";
    const prNumber: string = String(body?.prNumber ?? "");
    const m = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)(\/|$)/i);
    if (!m) return NextResponse.json({ error: "Invalid repository URL" }, { status: 400 });
    const owner = m[1], repo = m[2].replace(/\.git$/,"");

    const token = process.env.GITHUB_TOKEN;
    const ghInfo = await fetchFromGitHub(owner, repo, prNumber, token);

    const prompt = buildPrompt(ghInfo);
    const assistantText = await callOpenAI(prompt);

    let parsed = null;
    try {
      const cleaned = assistantText.replace(/^[\s`]*(json)?\s*/, "").replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return NextResponse.json({
        summary: ghInfo.prTitle ? `PR #${prNumber}: ${ghInfo.prTitle}` : "",
        risks: ["AI parse error; see assistantText"],
        tests: ["AI parse error; see assistantText"],
        docsSnippet: "AI parse error; see assistantText",
        ghInfo,
        assistantText
      });
    }

    return NextResponse.json({ ...parsed, ghInfo });
  } catch (err:any) {
    console.error("analyze error:", err?.message ?? err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
