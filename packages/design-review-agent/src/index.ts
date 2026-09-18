export interface ReviewScreenRequest {
  key: string;
  title: string;
  prompt: string;
  deviceType?: string;
}

export interface ReviewRequest {
  productId: string;
  projectTitle: string;
  screens: ReviewScreenRequest[];
}

export interface GeneratedScreen {
  key: string;
  title: string;
  projectId: string;
  screenId: string | null;
  htmlUrl: string | null;
  imageUrl: string | null;
}

export interface GeneratedDesignResult {
  provider: string;
  productId: string;
  projectId: string;
  screens: GeneratedScreen[];
  status: string;
}

export interface ScreenReview {
  key: string;
  title: string;
  status: 'PASS' | 'REVISE';
  score: number;
  checks: {
    generated: boolean;
    htmlFetched: boolean;
    arabicContent: boolean;
    rtl: boolean;
    interactive: boolean;
    responsiveViewport: boolean;
    noExposedSecrets: boolean;
  };
  warnings: string[];
  secretEvidence: Array<{
    kind: string;
    context: string;
  }>;
}

export interface DesignReviewResult {
  productId: string;
  projectId: string;
  status: 'DESIGN_PASS' | 'DESIGN_REVISION_REQUIRED';
  score: number;
  reviewedAt: string;
  summary: {
    expectedScreens: number;
    generatedScreens: number;
    passedScreens: number;
    rtlScreens: number;
    arabicScreens: number;
    interactiveScreens: number;
  };
  screens: ScreenReview[];
  blockingIssues: string[];
  limitations: string[];
}

export type HtmlFetcher = (url: string) => Promise<string>;

const ARABIC_RE = /[\u0600-\u06ff]/g;
const SECRET_PATTERNS = [
  { kind: 'openai-like-key', pattern: /\bsk-[A-Za-z0-9_-]{16,}\b/i },
  { kind: 'google-like-key', pattern: /\bAIza[0-9A-Za-z_-]{20,}\b/ },
  { kind: 'named-credential-assignment', pattern: /(?:api[_ -]?key|secret|token)\s*[:=]\s*["'][^"']{12,}["']/i },
] as const;

function ratioArabic(text: string): number {
  const compact = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!compact) return 0;
  const arabic = compact.match(ARABIC_RE)?.length ?? 0;
  const letters = compact.match(/[A-Za-z\u0600-\u06ff]/g)?.length ?? 0;
  return letters === 0 ? 0 : arabic / letters;
}

function hasRtl(html: string): boolean {
  return /dir\s*=\s*["']rtl["']/i.test(html)
    || /direction\s*:\s*rtl/i.test(html)
    || /\brtl\b/i.test(html);
}

function hasInteraction(html: string): boolean {
  return /<(button|input|select|textarea|form)\b/i.test(html)
    || /role\s*=\s*["']button["']/i.test(html);
}

function hasViewport(html: string): boolean {
  return /<meta[^>]+name\s*=\s*["']viewport["']/i.test(html);
}

function findSecretEvidence(html: string): Array<{ kind: string; context: string }> {
  const evidence: Array<{ kind: string; context: string }> = [];

  for (const entry of SECRET_PATTERNS) {
    const match = entry.pattern.exec(html);
    if (!match || match.index === undefined) continue;

    const start = Math.max(0, match.index - 80);
    const end = Math.min(html.length, match.index + match[0].length + 80);
    const rawContext = html.slice(start, end);
    const redacted = rawContext
      .replace(match[0], `[REDACTED ${entry.kind}]`)
      .replace(/\s+/g, ' ')
      .trim();

    evidence.push({
      kind: entry.kind,
      context: redacted.slice(0, 240),
    });
  }

  return evidence;
}

export async function defaultHtmlFetcher(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'OGroup-AI-Factory-Design-Review-Agent/0.1' },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching generated Stitch HTML`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function reviewGeneratedDesign(
  request: ReviewRequest,
  generated: GeneratedDesignResult,
  fetchHtml: HtmlFetcher = defaultHtmlFetcher,
): Promise<DesignReviewResult> {
  const blockingIssues: string[] = [];
  const reviews: ScreenReview[] = [];
  const byKey = new Map(generated.screens.map((screen) => [screen.key, screen]));

  if (generated.productId !== request.productId) {
    blockingIssues.push(`Product mismatch: expected ${request.productId}, received ${generated.productId}`);
  }

  if (!generated.projectId) {
    blockingIssues.push('Stitch project id is missing.');
  }

  for (const expected of request.screens) {
    const screen = byKey.get(expected.key);
    const warnings: string[] = [];
    const generatedOk = Boolean(screen?.screenId && screen?.htmlUrl);
    let html = '';
    let htmlFetched = false;

    if (!screen) {
      blockingIssues.push(`Missing generated screen: ${expected.key}`);
    } else if (!generatedOk) {
      blockingIssues.push(`Generated screen ${expected.key} is missing screenId or htmlUrl.`);
    } else {
      try {
        html = await fetchHtml(screen.htmlUrl as string);
        htmlFetched = html.length > 0;
      } catch (error) {
        warnings.push(`HTML fetch failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const arabicRatio = htmlFetched ? ratioArabic(html) : 0;
    const arabicContent = arabicRatio >= 0.12;
    const rtl = htmlFetched && hasRtl(html);
    const interactive = htmlFetched && hasInteraction(html);
    const responsiveViewport = htmlFetched && hasViewport(html);
    const secretEvidence = htmlFetched ? findSecretEvidence(html) : [];
    const noExposedSecrets = secretEvidence.length === 0;

    if (htmlFetched && !arabicContent) warnings.push('Arabic content is weak or absent.');
    if (htmlFetched && !rtl) warnings.push('No explicit RTL signal detected.');
    if (htmlFetched && !interactive) warnings.push('No obvious interactive controls detected.');
    if (htmlFetched && !responsiveViewport) warnings.push('Responsive viewport meta tag not detected.');
    if (!noExposedSecrets) {
      blockingIssues.push(`Potential exposed credential-like value detected in ${expected.key}.`);
    }

    const weighted = [
      [generatedOk, 30],
      [htmlFetched, 20],
      [arabicContent, 15],
      [rtl, 15],
      [interactive, 10],
      [responsiveViewport, 5],
      [noExposedSecrets, 5],
    ] as const;
    const score = weighted.reduce((sum, [ok, weight]) => sum + (ok ? weight : 0), 0);
    const status: ScreenReview['status'] =
      generatedOk && htmlFetched && noExposedSecrets && score >= 70 ? 'PASS' : 'REVISE';

    reviews.push({
      key: expected.key,
      title: expected.title,
      status,
      score,
      checks: {
        generated: generatedOk,
        htmlFetched,
        arabicContent,
        rtl,
        interactive,
        responsiveViewport,
        noExposedSecrets,
      },
      warnings,
      secretEvidence,
    });
  }

  const passedScreens = reviews.filter((screen) => screen.status === 'PASS').length;
  const rtlScreens = reviews.filter((screen) => screen.checks.rtl).length;
  const arabicScreens = reviews.filter((screen) => screen.checks.arabicContent).length;
  const interactiveScreens = reviews.filter((screen) => screen.checks.interactive).length;
  const score = reviews.length === 0
    ? 0
    : Math.round(reviews.reduce((sum, screen) => sum + screen.score, 0) / reviews.length);

  if (generated.screens.length !== request.screens.length) {
    blockingIssues.push(
      `Screen count mismatch: expected ${request.screens.length}, generated ${generated.screens.length}.`,
    );
  }

  const structuralPass = passedScreens === request.screens.length;
  const rtlPass = rtlScreens >= Math.ceil(request.screens.length * 0.75);
  const arabicPass = arabicScreens >= Math.ceil(request.screens.length * 0.75);

  if (!rtlPass) blockingIssues.push('RTL coverage is below the 75% Factory threshold.');
  if (!arabicPass) blockingIssues.push('Arabic-content coverage is below the 75% Factory threshold.');

  const status: DesignReviewResult['status'] =
    blockingIssues.length === 0 && structuralPass ? 'DESIGN_PASS' : 'DESIGN_REVISION_REQUIRED';

  return {
    productId: request.productId,
    projectId: generated.projectId,
    status,
    score,
    reviewedAt: new Date().toISOString(),
    summary: {
      expectedScreens: request.screens.length,
      generatedScreens: generated.screens.length,
      passedScreens,
      rtlScreens,
      arabicScreens,
      interactiveScreens,
    },
    screens: reviews,
    blockingIssues,
    limitations: [
      'v0.1 reviews generated HTML structure/content and does not yet perform pixel-level visual judgment.',
      'A future visual reviewer should inspect rendered screenshots for spacing, hierarchy, clipping, contrast and cross-screen consistency.',
    ],
  };
}
