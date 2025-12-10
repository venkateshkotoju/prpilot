import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const repoUrl = body?.repoUrl ?? "";
  const prNumber = body?.prNumber ?? "";

  const mockResponse = {
    summary: `Pull request #${prNumber} in ${repoUrl} introduces several changes that improve the developer experience and code clarity.`,
    risks: [
      "Refactored modules may introduce regressions if existing edge cases are not covered by tests.",
      "Changes to shared utility functions can impact multiple features across the app.",
      "If deployment configuration has been updated, misconfiguration could affect production stability.",
    ],
    tests: [
      "Add unit tests for any new utility functions introduced in this PR.",
      "Update integration tests that touch the modified API endpoints.",
      "Run end-to-end flows that rely on the updated components to ensure no visual regressions.",
    ],
    docsSnippet:
      "This pull request refactors shared utilities and updates core components to improve readability and maintainability. It also introduces clearer separation of concerns, making future feature work easier and safer.",
  };

  return NextResponse.json(mockResponse);
}