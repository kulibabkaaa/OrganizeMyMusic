import { loadRuntimeEnv } from "@/lib/load-runtime-env";

loadRuntimeEnv();

type CheckStatus = "pass" | "fail";

interface CheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
}

interface HealthResponse {
  ok?: boolean;
  revision?: {
    environment?: string;
    commitSha?: string;
    branch?: string;
  };
}

interface GitHubStatusResponse {
  sha: string;
  state: string;
  statuses: Array<{
    context: string;
    state: string;
    description?: string;
    target_url?: string;
  }>;
}

const defaultProductionUrl = "https://organize-my-music.vercel.app";
const defaultGitHubRepo = "kulibabkaaa/OrganizeMyMusic";

function result(name: string, status: CheckStatus, detail: string): CheckResult {
  return { name, status, detail };
}

async function run() {
  const appUrl = normalizeBaseUrl(process.env.PRODUCTION_SMOKE_URL);
  const githubRepo = process.env.PRODUCTION_SMOKE_GITHUB_REPO || defaultGitHubRepo;
  const githubBranch = process.env.PRODUCTION_SMOKE_GITHUB_BRANCH || "main";
  const checks: CheckResult[] = [];

  const health = await fetchJson<HealthResponse>(`${appUrl}/api/health`);
  const healthCommit = health.body?.revision?.commitSha;
  checks.push(
    result(
      "production health",
      health.response.ok &&
        health.body?.ok === true &&
        health.body.revision?.environment === "production" &&
        health.body.revision?.branch === githubBranch &&
        Boolean(healthCommit)
        ? "pass"
        : "fail",
      health.response.ok
        ? `environment=${health.body?.revision?.environment ?? "unknown"}, branch=${health.body?.revision?.branch ?? "unknown"}, commit=${healthCommit ?? "unknown"}`
        : `HTTP ${health.response.status}`
    )
  );

  const [home, dashboard, githubStatus] = await Promise.all([
    fetchText(`${appUrl}/`),
    fetchText(`${appUrl}/dashboard`),
    fetchJson<GitHubStatusResponse>(
      `https://api.github.com/repos/${githubRepo}/commits/${githubBranch}/status`,
      githubHeaders()
    )
  ]);
  const githubStatusBody = githubStatus.body;

  checks.push(
    result(
      "production landing",
      home.response.ok &&
        home.text.includes("Apple Music organization platform") &&
        home.text.includes('href="/auth"')
        ? "pass"
        : "fail",
      home.response.ok ? "landing page renders platform-first signed-out CTA" : `HTTP ${home.response.status}`
    )
  );

  checks.push(
    result(
      "production dashboard signed-out state",
      dashboard.response.ok &&
        dashboard.text.includes("Your music workspace") &&
        dashboard.text.includes("Sign in to continue.")
        ? "pass"
        : "fail",
      dashboard.response.ok ? "dashboard resolves to signed-out /app workspace" : `HTTP ${dashboard.response.status}`
    )
  );

  checks.push(
    result(
      "github deployment statuses",
      githubStatus.response.ok &&
        githubStatusBody !== null &&
        githubStatusBody.sha === healthCommit &&
        githubStatusBody.state === "success" &&
        hasSuccessfulStatus(githubStatusBody, "Vercel") &&
        hasSuccessfulWorkerStatus(githubStatusBody)
        ? "pass"
        : "fail",
      githubStatus.response.ok
        ? summarizeStatuses(githubStatusBody, healthCommit)
        : `HTTP ${githubStatus.response.status}`
    )
  );

  printAndExit(checks);
}

function normalizeBaseUrl(value: string | undefined) {
  const baseUrl = value?.trim() || defaultProductionUrl;

  return baseUrl.replace(/\/+$/, "");
}

async function fetchJson<T>(url: string, headers?: HeadersInit) {
  const response = await fetchWithContext(url, { headers });
  const body = response.ok ? ((await response.json()) as T) : null;

  return {
    response,
    body
  };
}

async function fetchText(url: string) {
  const response = await fetchWithContext(url);
  const text = await response.text().catch(() => "");

  return {
    response,
    text
  };
}

async function fetchWithContext(url: string, init?: RequestInit) {
  try {
    return await fetch(url, init);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to fetch ${url}: ${detail}`);
  }
}

function githubHeaders(): HeadersInit | undefined {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  if (!token) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${token}`,
    "User-Agent": "organize-your-music-smoke-preflight"
  };
}

function hasSuccessfulStatus(status: GitHubStatusResponse | null, context: string) {
  return Boolean(
    status?.statuses.some(
      (entry) =>
        entry.state === "success" &&
        entry.context.toLowerCase().includes(context.toLowerCase())
    )
  );
}

function hasSuccessfulWorkerStatus(status: GitHubStatusResponse | null) {
  return Boolean(
    status?.statuses.some((entry) => {
      const context = entry.context.toLowerCase();

      // Railway can publish the GitHub status under the service name.
      return (
        entry.state === "success" &&
        (context.includes("railway") || context.includes("organizemusic") || context.includes("organizemymusic"))
      );
    })
  );
}

function summarizeStatuses(status: GitHubStatusResponse | null, expectedSha: string | undefined) {
  if (!status) {
    return "GitHub status response missing";
  }

  const statuses = status.statuses
    .map((entry) => `${entry.context}:${entry.state}`)
    .join(", ");

  return `sha=${status.sha}, expected=${expectedSha ?? "unknown"}, state=${status.state}, statuses=${statuses}`;
}

function printAndExit(checks: CheckResult[]): never {
  for (const check of checks) {
    const marker = check.status === "pass" ? "PASS" : "FAIL";
    console.log(`${marker} ${check.name}: ${check.detail}`);
  }

  if (checks.some((check) => check.status === "fail")) {
    process.exit(1);
  }

  process.exit(0);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
