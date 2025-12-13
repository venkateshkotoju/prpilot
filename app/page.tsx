
"use client";

import { FormEvent, useState } from "react";

type AnalysisResult = {
  summary: string;
  risks: string[];
  tests: string[];
  docsSnippet: string;
};

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [prNumber, setPrNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze-pr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repoUrl,
          prNumber,
        }),
      });

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = (await res.json()) as AnalysisResult;
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while analyzing this pull request.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex justify-center px-4">
      <div className="max-w-4xl w-full py-10 space-y-10">
        {/* Header */}
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            PRPilot AI
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold">
            AI copilot for your pull requests.
          </h1>
          <p className="text-sm md:text-base text-slate-400 max-w-2xl">
            Paste a GitHub repository and pull request number to get an instant
            AI summary, risk analysis, test suggestions, and documentation notes.
          </p>
        </header>

        {/* Input Form */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4">
          <h2 className="text-lg font-medium">Analyze a pull request</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">
                GitHub Repository URL
              </label>
              <input
                type="url"
                required
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">
                Pull Request Number
              </label>
              <input
                type="number"
                min={1}
                required
                placeholder="e.g. 17"
                value={prNumber}
                onChange={(e) => setPrNumber(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium bg-sky-500 hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isLoading ? "Analyzing…" : "Analyze PR"}
            </button>
          </form>

          {error && (
            <p className="text-xs text-red-400 pt-2">
              {error}
            </p>
          )}
<p className="text-[11px] text-slate-500">
  Powered by the GitHub API and an AI model to generate PR-aware analysis in real time.
</p>

          
        </section>

        {/* Results Layout */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium">AI review</h2>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Summary */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
              <h3 className="text-sm font-semibold">Summary</h3>
              <p className="text-xs text-slate-400">
                {result
                  ? result.summary
                  : "Run an analysis to see an AI-generated summary of the pull request."}
              </p>
            </div>

            {/* Risks */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
              <h3 className="text-sm font-semibold">Potential risks</h3>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                {result
                  ? result.risks.map((risk, idx) => <li key={idx}>{risk}</li>)
                  : (
                    <li>
                      Once you analyze a PR, AI will list possible risk areas here.
                    </li>
                    )}
              </ul>
            </div>

            {/* Tests */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
              <h3 className="text-sm font-semibold">Suggested tests</h3>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                {result
                  ? result.tests.map((test, idx) => <li key={idx}>{test}</li>)
                  : (
                    <li>
                      After analysis, you’ll see test suggestions here based on the
                      type of changes made.
                    </li>
                    )}
              </ul>
            </div>

            {/* Docs / Changelog */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
              <h3 className="text-sm font-semibold">Docs & changelog snippet</h3>
              <p className="text-xs text-slate-400">
                {result
                  ? result.docsSnippet
                  : "This area will show documentation or changelog text that you can paste into your project docs."}
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-4 border-t border-slate-900 text-[11px] text-slate-500">
          Built for the WeMakeDevs hackathon • Deployed on Vercel • Developed with
          CodeRabbit-reviewed pull requests.
        </footer>
      </div>
    </main>
  );
}
