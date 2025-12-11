// app/api/analyze-pr/route.ts
import { NextResponse } from "next/server";

async function fetchFromGitHub(owner: string, repo: string, prNumber: string, token?: string) {
  const headers: Record<string,string> = {
    "Accept": "application/vnd.github+json"
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // 1) Get PR details
  const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, { headers });
  if (!prRes.ok) {
    throw new Error(`GitHub PR fetch failed: ${prRes.status}`);
  }
  const pr = await prRes.json();

  // 2) Get list of files changed (first page)
  const filesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`, { headers });
  const files = filesRes.ok ? await filesRes.json() : [];

  // Build a compact representation we can feed to an LLM later
  const changedFiles = (files as any[]).slice(0, 10).map(f => ({
    filename: f.filename,
    status: f.status,
    changes: f.changes,
    patch: f.patch?.substring(0, 2000) // limit patch size
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

    // parse owner/repo from common GitHub URL forms
    const m = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)(\/|$)/i);
    if (!m) {
      return NextResponse.json({ error: "Invalid repository URL" }, { status: 400 });
    }
    const owner = m[1];
    const repo = m[2].replace(/\.git$/,"");

    const token = process.env.GITHUB_TOKEN; // set this in Vercel and .env.local for dev

    // fetch PR details from GitHub
    const ghInfo = await fetchFromGitHub(owner, repo, prNumber, token);

    // For now, instead of calling an LLM, we return a simple heuristic summary
    // (Later: call your LLM here with the prompt assembled from ghInfo)
    const summary = `PR #${prNumber} by ${ghInfo.author}: ${ghInfo.prTitle}. ${ghInfo.prBody ? ghInfo.prBody.slice(0,300) : ""}`;

    const risks = [
      "Potential regressions in modified modules — review test coverage.",
      "Large patch sizes in files: inspect the changes carefully.",
    ];
    const tests = [
      "Add unit tests for modified utility functions.",
      "Run integration tests for updated endpoints."
    ];
    const docsSnippet = `This PR updates ${ghInfo.changedFiles.length} files and modifies core logic.`;

    return NextResponse.json({
      summary,
      risks,
      tests,
      docsSnippet,
      ghInfo
    });
  } catch (err:any) {
    console.error("analyze error:", err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
