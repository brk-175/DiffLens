"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getAccessToken, getGuestTokenForReview } from "@/lib/auth/session";

type ReviewStatus = "queued" | "processing" | "complete" | "failed";
type Severity = "critical" | "high" | "medium" | "low";
type Verdict = "pass" | "pass_with_notes" | "needs_changes";

type ReviewStatusResponse = {
  review_id: number;
  status: ReviewStatus;
  overall_verdict: Verdict | null;
  risk_level: string | null;
  short_summary: string | null;
  error_message: string | null;
};

type ReviewIssue = {
  severity: Severity;
  mode_tags: string[];
  line_start: number | null;
  line_end: number | null;
  comment: string;
  suggested_fix: string | null;
  why_this_matters: {
    what_is_wrong: string;
    why_it_matters: string;
    how_to_fix: string;
    code_example: string | null;
  };
};

type ReviewFile = {
  file_path: string;
  file_summary: string;
  issues: ReviewIssue[];
};

type ReviewResult = {
  summary: {
    overall_verdict: Verdict;
    risk_level: string;
    short_summary: string;
  };
  files: ReviewFile[];
  final_summary: {
    key_takeaways: string[];
    recommended_next_steps: string[];
  };
};

type ViewerLine = {
  line: number;
  text: string;
  issueIndex: number | null;
};

const severityClass: Record<Severity, string> = {
  critical: "text-[#ff4d6d] border-[#ff4d6d] bg-[#ff4d6d]/15",
  high: "text-[#ff7a7a] border-[#ff7a7a] bg-[#ff7a7a]/10",
  medium: "text-[#fbbf24] border-[#fbbf24] bg-[#fbbf24]/10",
  low: "text-[#1DCD9F] border-[#1DCD9F] bg-[#1DCD9F]/10",
};

type ToneStyle = {
  border: string;
  value: string;
  bg: string;
};

const VERDICT_TONE: Record<string, ToneStyle> = {
  pass: {
    border: "border-[#1DCD9F]/70",
    value: "text-[#1DCD9F]",
    bg: "bg-[#1DCD9F]/8",
  },
  pass_with_notes: {
    border: "border-[#60A5FA]/70",
    value: "text-[#60A5FA]",
    bg: "bg-[#60A5FA]/10",
  },
  needs_changes: {
    border: "border-[#ff4d6d]/80",
    value: "text-[#ff4d6d]",
    bg: "bg-[#ff4d6d]/8",
  },
  pending: {
    border: "border-[#91927c]/60",
    value: "text-[#c8c8af]",
    bg: "bg-[#ffffff]/[0.03]",
  },
};

const RISK_TONE: Record<string, ToneStyle> = {
  low: {
    border: "border-[#1DCD9F]/70",
    value: "text-[#1DCD9F]",
    bg: "bg-[#1DCD9F]/8",
  },
  medium: {
    border: "border-[#fbbf24]/70",
    value: "text-[#fbbf24]",
    bg: "bg-[#fbbf24]/10",
  },
  high: {
    border: "border-[#fb923c]/75",
    value: "text-[#fb923c]",
    bg: "bg-[#fb923c]/10",
  },
  critical: {
    border: "border-[#ff4d6d]/80",
    value: "text-[#ff4d6d]",
    bg: "bg-[#ff4d6d]/8",
  },
  pending: {
    border: "border-[#91927c]/60",
    value: "text-[#c8c8af]",
    bg: "bg-[#ffffff]/[0.03]",
  },
};

function buildViewerLines(file: ReviewFile | undefined): ViewerLine[] {
  if (!file) return [];

  const lines: ViewerLine[] = [];
  let fallbackLine = 100;

  file.issues.forEach((issue, issueIndex) => {
    const start = issue.line_start ?? fallbackLine;
    const source =
      issue.why_this_matters.code_example?.trim() ||
      issue.suggested_fix?.trim() ||
      issue.comment.trim();

    const snippetLines = source
      .split("\n")
      .map((line) => line.replace(/\t/g, "    ").trimEnd())
      .filter((line) => line.length > 0)
      .slice(0, 5);

    if (!snippetLines.length) {
      snippetLines.push(issue.comment.trim() || "Issue detected");
    }

    snippetLines.forEach((text, i) => {
      lines.push({
        line: start + i,
        text,
        issueIndex,
      });
    });

    fallbackLine = Math.max(fallbackLine + 1, start + snippetLines.length + 2);
    lines.push({ line: fallbackLine, text: "", issueIndex: null });
  });

  if (!lines.length) {
    return [
      { line: 100, text: "No issues found for this file.", issueIndex: null },
      { line: 101, text: "This file passed configured checks.", issueIndex: null },
    ];
  }

  return lines;
}

function verdictDisplay(v: Verdict | null | undefined): string {
  if (!v) return "pending";
  return v;
}

function normalizeToken(value: string | null | undefined): string {
  return (value || "pending").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function verdictLabel(value: string | null | undefined): string {
  const token = normalizeToken(value);
  return token.replaceAll("_", " ");
}

function riskLabel(value: string | null | undefined): string {
  const token = normalizeToken(value);
  return token.replaceAll("_", " ");
}

export default function ReviewDashboardPage() {
  const params = useParams<{ reviewId: string }>();
  const reviewId = Number(params.reviewId);

  const apiBase = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/$/, ""),
    []
  );

  const [statusData, setStatusData] = useState<ReviewStatusResponse | null>(null);
  const [resultData, setResultData] = useState<ReviewResult | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [expandedIssueIndex, setExpandedIssueIndex] = useState<number | null>(0);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isFilesSidebarCollapsed, setIsFilesSidebarCollapsed] = useState(false);
  const [isResultsSidebarCollapsed, setIsResultsSidebarCollapsed] = useState(false);
  const [activeSeverityFilter, setActiveSeverityFilter] = useState<Severity | "all">("all");
  const [copiedIssueIndex, setCopiedIssueIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const container = document.getElementById("review-canvas-bg") as HTMLCanvasElement | null;
    if (!container) return;

    const ctx = container.getContext("2d");
    if (!ctx) return;

    const particles = Array.from({ length: 90 }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00035,
      vy: (Math.random() - 0.5) * 0.00035,
      r: Math.random() * 1.8 + 0.4,
    }));

    const resize = () => {
      container.width = window.innerWidth;
      container.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    let rafId = 0;

    const draw = () => {
      frame += 1;
      ctx.clearRect(0, 0, container.width, container.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;

        const px = p.x * container.width;
        const py = p.y * container.height;

        ctx.beginPath();
        ctx.fillStyle = "rgba(187,203,46,0.22)";
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b = particles[j];
          const ax = a.x * container.width;
          const ay = a.y * container.height;
          const bx = b.x * container.width;
          const by = b.y * container.height;
          const dist = Math.hypot(ax - bx, ay - by);
          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.08;
            ctx.strokeStyle = `rgba(187,203,46,${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
          }
        }
      }

      // soft scan pulse
      const y = ((frame * 1.4) % (container.height + 80)) - 40;
      const grd = ctx.createLinearGradient(0, y - 2, 0, y + 2);
      grd.addColorStop(0, "rgba(0,0,0,0)");
      grd.addColorStop(0.5, "rgba(187,203,46,0.14)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, y - 2, container.width, 4);

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    if (!Number.isFinite(reviewId) || reviewId <= 0) {
      setError("Invalid review ID.");
      setLoading(false);
      return;
    }

    const accessToken = getAccessToken();
    const guestToken = getGuestTokenForReview(reviewId);

    const withAuth = (path: string) => {
      const url = new URL(`${apiBase}${path}`);
      if (guestToken) {
        url.searchParams.set("guest_token", guestToken);
      }
      return fetch(url.toString(), {
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
    };

    let cancelled = false;

    const fetchStatus = async () => {
      const res = await withAuth(`/reviews/${reviewId}`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to load review status.");
      }
      const data = (await res.json()) as ReviewStatusResponse;
      if (!cancelled) setStatusData(data);
      return data;
    };

    const fetchResult = async () => {
      const res = await withAuth(`/reviews/${reviewId}/result`);
      if (res.status === 409) {
        return null;
      }
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to load review result.");
      }
      const data = (await res.json()) as ReviewResult;
      if (!cancelled) {
        setResultData(data);
        setSelectedFileIndex(0);
        setExpandedIssueIndex(null);
      }
      return data;
    };

    const run = async () => {
      setLoading(true);
      setError("");

      try {
        for (let attempt = 0; attempt < 180; attempt += 1) {
          const st = await fetchStatus();

          if (st.status === "failed") {
            throw new Error(st.error_message || "Review failed.");
          }

          if (st.status === "complete") {
            const result = await fetchResult();
            if (result) {
              if (!cancelled) setLoading(false);
              return;
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 2000));
          if (cancelled) return;
        }

        throw new Error("Review is taking longer than expected. Please refresh in a minute.");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unable to load review.");
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [apiBase, reviewId]);

  const files = resultData?.files ?? [];
  const selectedFile = files[selectedFileIndex];
  const issues = selectedFile?.issues ?? [];
  const viewerLines = buildViewerLines(selectedFile);

  const severityCounts = useMemo(
    () => ({
      critical: issues.filter((i) => i.severity === "critical").length,
      high: issues.filter((i) => i.severity === "high").length,
      medium: issues.filter((i) => i.severity === "medium").length,
      low: issues.filter((i) => i.severity === "low").length,
    }),
    [issues]
  );

  const filteredIssues = useMemo(
    () =>
      issues
        .map((issue, index) => ({ issue, index }))
        .filter(({ issue }) => activeSeverityFilter === "all" || issue.severity === activeSeverityFilter),
    [issues, activeSeverityFilter]
  );

  const criticalCount = useMemo(
    () => issues.filter((issue) => issue.severity === "critical").length,
    [issues]
  );

  useEffect(() => {
    setActiveSeverityFilter("all");
    setExpandedIssueIndex(issues.length ? 0 : null);
  }, [selectedFileIndex, issues.length]);

  const copySuggestedFix = async (text: string, issueIndex: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIssueIndex(issueIndex);
      window.setTimeout(() => {
        setCopiedIssueIndex((current) => (current === issueIndex ? null : current));
      }, 1500);
    } catch {
      // no-op
    }
  };

  const headerSummary =
    resultData?.summary.short_summary ||
    statusData?.short_summary ||
    "Automated code review is processing your diff. Results will appear as soon as analysis completes.";

  const verdict = resultData?.summary.overall_verdict || statusData?.overall_verdict;
  const riskLevel = resultData?.summary.risk_level || statusData?.risk_level || "pending";
  const hasDetailedSummary = Boolean(resultData?.files?.length || resultData?.final_summary?.key_takeaways?.length);
  const verdictTone = VERDICT_TONE[normalizeToken(verdict)] ?? VERDICT_TONE.pending;
  const riskTone = RISK_TONE[normalizeToken(riskLevel)] ?? RISK_TONE.pending;

  return (
    <div className="bg-[#000000] text-[#e2e2e2] min-h-screen flex flex-col overflow-x-hidden overflow-y-auto relative pt-18">
      <canvas id="review-canvas-bg" className="absolute inset-0 w-full h-full -z-10 opacity-30 pointer-events-none" />

      <header className="bg-[#000000]/90 backdrop-blur-md px-6 py-5 flex flex-col gap-4 z-10">
        <div className="flex justify-between items-start gap-4">
          <div className="flex flex-col gap-2 max-w-4xl">
            <div className="inline-flex items-center gap-3 rounded-lg bg-[#0c1106]/90 px-3 py-2 shadow-[0_0_16px_rgba(187,203,46,0.08)]">
              <span className="material-symbols-outlined text-[#bbcb2e]">monitoring</span>

              <div className="flex items-center gap-2">
                <span className="text-l md:text-xl font-semibold tracking-tight text-[#f2f4e8]">
                  Analysis Report
                </span>
                <span className="text-[#7d8367]">:</span>
                <span className="inline-flex items-center rounded-md border border-[#bbcb2e]/35 bg-[#bbcb2e]/10 px-2 py-0.5 text-m font-semibold text-[#d7e84a]">
                  PR - {reviewId}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div
              className={`min-w-28 rounded-md px-2.5 py-1.5 ${verdictTone.border} ${verdictTone.bg}`}
              title="Overall verdict"
            >
              <p className="text-[10px] tracking-[0.14em] uppercase text-[#c8c8af] mb-0.5">Overall Verdict</p>
              <p className={`text-sm leading-tight font-semibold capitalize ${verdictTone.value}`}>
                {verdictLabel(verdictDisplay(verdict))}
              </p>
            </div>

            <div
              className={`min-w-24 rounded-md px-2.5 py-1.5 ${riskTone.border} ${riskTone.bg}`}
              title="Risk level"
            >
              <p className="text-[10px] tracking-[0.14em] uppercase text-[#c8c8af] mb-0.5">Risk Level</p>
              <p className={`text-sm leading-tight font-semibold capitalize ${riskTone.value}`}>{riskLabel(riskLevel)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#474835] bg-[#0b0f03]/70 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsSummaryExpanded((prev) => !prev)}
            className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#bbcb2e]/8 transition-all duration-400"
            aria-expanded={isSummaryExpanded}
            aria-controls="diff-summary-panel"
          >
            <div
              className="flex-1 flex items-center justify-start gap-3 text-left transition-all duration-500"
            >
              <span
                className="material-symbols-outlined text-[#bbcb2e] transition-all duration-400 w-6"
              >
                summarize
              </span>

              <div className="transition-all duration-500 text-left">
                <p
                  className={`uppercase text-[#c8c8af] transition-all duration-500 ${
                    isSummaryExpanded
                      ? "text-[14px] tracking-[0.14em] translate-y-0.5 mt-[-6]"
                      : "text-xs tracking-widest"
                  }`}
                >
                  Diff Summary
                </p>
                <p
                  className={`text-sm text-[#e2e2e2] transition-all duration-400 ${
                    isSummaryExpanded
                      ? "max-h-0 opacity-0 overflow-hidden pointer-events-none"
                      : "max-h-8 opacity-100 truncate max-w-[72vw] md:max-w-[64vw]"
                  }`}
                >
                  {loading ? "Generating high-level summary..." : headerSummary}
                </p>
              </div>
            </div>

            <span
              className={`material-symbols-outlined text-[#bbcb2e] transition-transform duration-300 ${
                isSummaryExpanded ? "rotate-180" : "rotate-0"
              }`}
            >
              expand_more
            </span>
          </button>

          <div
            id="diff-summary-panel"
            className={`px-4 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isSummaryExpanded
                ? "max-h-135 opacity-100 translate-y-0 py-4 border-t border-[#474835]"
                : "max-h-0 opacity-0 -translate-y-1 py-0 border-t border-transparent"
            }`}
          >
            <div className="space-y-4">
              <div className="rounded border border-[#474835] bg-black/50 p-3">
                <p className="text-[11px] uppercase tracking-widest text-[#c8c8af] mb-1">Overview</p>
                <p className="text-sm leading-6 text-[#d8d8c6]">{headerSummary}</p>
              </div>

              {resultData?.files?.length ? (
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-widest text-[#c8c8af]">File-level Summary</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {resultData.files.map((file, idx) => (
                      <button
                        key={`${file.file_path}-${idx}`}
                        type="button"
                        onClick={() => {
                          setSelectedFileIndex(idx);
                          setExpandedIssueIndex(file.issues.length ? 0 : null);
                        }}
                        className="w-full text-left rounded border border-[#474835] bg-[#121212] hover:border-[#bbcb2e]/70 hover:bg-[#161a0b] transition-colors p-3"
                      >
                        <p className="font-mono text-xs text-[#bbcb2e] truncate">{file.file_path}</p>
                        <p className="text-sm text-[#c8c8af] mt-1 leading-5">{file.file_summary || "No summary available."}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                !loading && (
                  <div className="rounded border border-dashed border-[#474835] p-3 text-sm text-[#c8c8af]">
                    Detailed file summary will appear once analysis completes.
                  </div>
                )
              )}

              {resultData?.final_summary?.key_takeaways?.length ? (
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-[#c8c8af] mb-2">Key Takeaways</p>
                  <div className="flex flex-wrap gap-2">
                    {resultData.final_summary.key_takeaways.map((item, idx) => (
                      <span
                        key={`${item}-${idx}`}
                        className="inline-flex items-center rounded-full border border-[#bbcb2e]/40 bg-[#bbcb2e]/10 text-[#e7efb2] text-xs px-3 py-1"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {!hasDetailedSummary && !loading && (
                <p className="text-xs text-[#8f9471]">No additional summary details available for this review yet.</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex z-10 min-h-130 px-6 pb-5">
        <aside
          className={`border border-[#474835] bg-[#000000]/90 backdrop-blur-md flex flex-col animate-slide-left transition-all duration-300 rounded-l-lg overflow-hidden ${
            isFilesSidebarCollapsed ? "w-16" : "w-64"
          }`}
        >
          <div className="p-3 border-b border-[#474835] flex items-center justify-between gap-2">
            {!isFilesSidebarCollapsed && (
              <h2 className="text-xs uppercase tracking-widest text-[#c8c8af]">Files Reviewed ({files.length})</h2>
            )}
            <button
              type="button"
              onClick={() => setIsFilesSidebarCollapsed((prev) => !prev)}
              className="ml-auto inline-flex items-center justify-center h-7 w-7 rounded border border-[#474835] text-[#c8c8af] hover:text-[#bbcb2e] hover:border-[#bbcb2e]/70 transition-colors cursor-ew-resize"
              title={isFilesSidebarCollapsed ? "Expand file list" : "Collapse file list"}
              aria-label={isFilesSidebarCollapsed ? "Expand file list" : "Collapse file list"}
            >
              <span className="material-symbols-outlined text-base">
                {isFilesSidebarCollapsed ? "chevron_right" : "chevron_left"}
              </span>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
            {files.map((file, i) => {
              const fileIssues = file.issues.length;
              const active = i === selectedFileIndex;
              return (
                <button
                  key={`${file.file_path}-${i}`}
                  type="button"
                  onClick={() => {
                    setSelectedFileIndex(i);
                    setExpandedIssueIndex(file.issues.length ? 0 : null);
                  }}
                  title={file.file_path}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 border-l-2 transition-all cursor-pointer file-list-item ${
                    active
                      ? "border-[#bbcb2e] bg-[#bbcb2e]/10 text-[#bbcb2e]"
                      : "border-transparent text-[#c8c8af] hover:text-[#e2e2e2]"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">description</span>
                  {!isFilesSidebarCollapsed && <span className="font-mono text-sm truncate">{file.file_path}</span>}
                  {fileIssues > 0 && (
                    <span
                      className={`${isFilesSidebarCollapsed ? "ml-0" : "ml-auto"} inline-flex items-center justify-center min-w-4 h-4 rounded-full bg-[#ff4d6d]/20 text-[#ff4d6d] text-[10px] font-bold px-1`}
                    >
                      {isFilesSidebarCollapsed ? "•" : fileIssues}
                    </span>
                  )}
                </button>
              );
            })}

            {!files.length && (
              <div className={`${isFilesSidebarCollapsed ? "px-2" : "px-4"} py-3 text-sm text-[#c8c8af]`}>
                {isFilesSidebarCollapsed ? "—" : "No analyzed files yet."}
              </div>
            )}
          </nav>
        </aside>

        <main className="flex-1 bg-[#000000]/80 border-y border-r border-[#474835] flex flex-col overflow-hidden relative animate-fade-scale">
          <div className="h-10 border-b border-[#474835] flex items-center px-4 gap-4 bg-[#0e0e0e] shrink-0 z-10 relative">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">code</span>
              <span className="font-mono text-sm">{selectedFile?.file_path || "No file selected"}</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-6 text-[#e2e2e2]">
            {viewerLines.map((line, i) => {
              const isHighlighted = line.issueIndex !== null;
              const isActiveIssue = line.issueIndex !== null && line.issueIndex === expandedIssueIndex;

              return (
                <div
                  key={`${line.line}-${i}`}
                  className={`grid grid-cols-[48px_1fr] group ${
                    isHighlighted ? "issue-highlight relative" : ""
                  } ${isActiveIssue ? "ring-1 ring-[#ff4d6d]/40" : ""}`}
                >
                  <div
                    className={`text-right pr-4 select-none ${
                      isHighlighted ? "text-[#ff4d6d] font-bold" : "text-[#c8c8af]/50"
                    }`}
                  >
                    {line.line}
                  </div>

                  <div className={`pl-4 whitespace-pre-wrap wrap-break-word ${isHighlighted ? "text-[#f5f5f5]" : ""}`}>
                    {line.text}
                    {isHighlighted && isActiveIssue && (
                      <span className="ml-3 inline-flex px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold border border-[#ff2f57] text-[#ff2f57] align-middle cursor-default select-none">
                        Issue Detected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        <aside
          className={`border-y border-r border-[#474835] bg-[#000000]/90 backdrop-blur-md flex flex-col z-10 animate-slide-right rounded-r-lg overflow-hidden transition-all duration-300 ${
            isResultsSidebarCollapsed ? "w-16" : "w-96"
          }`}
        >
          <div className="p-3 border-b border-[#474835] bg-[#0e0e0e] shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsResultsSidebarCollapsed((prev) => !prev)}
              className="inline-flex items-center justify-center h-7 w-7 rounded border border-[#474835] text-[#c8c8af] hover:text-[#bbcb2e] hover:border-[#bbcb2e]/70 transition-colors cursor-ew-resize"
              title={isResultsSidebarCollapsed ? "Expand analysis panel" : "Collapse analysis panel"}
              aria-label={isResultsSidebarCollapsed ? "Expand analysis panel" : "Collapse analysis panel"}
            >
              <span className="material-symbols-outlined text-base">
                {isResultsSidebarCollapsed ? "chevron_left" : "chevron_right"}
              </span>
            </button>

            {!isResultsSidebarCollapsed && (
              <h2 className="text-xs uppercase tracking-widest pl-2">
                Analysis Results ({filteredIssues.length}/{issues.length})
              </h2>
            )}
          </div>

          {!isResultsSidebarCollapsed && (
            <>
              <div className="px-3 py-2 border-b border-[#474835] bg-[#0f0f0f] flex flex-wrap gap-2 items-center">
                {criticalCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] rounded border border-[#ff4d6d]/30 bg-[#ff4d6d]/20 text-[#ff4d6d] font-bold">
                    {criticalCount} Critical
                  </span>
                )}

                {(["all", "critical", "high", "medium", "low"] as const).map((level) => {
                  const count =
                    level === "all" ? issues.length : severityCounts[level as Exclude<typeof level, "all">];
                  const isActive = activeSeverityFilter === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setActiveSeverityFilter(level)}
                      className={`px-2 py-0.5 text-[10px] rounded border uppercase tracking-wide transition-colors ${
                        isActive
                          ? "border-[#bbcb2e]/70 bg-[#bbcb2e]/15 text-[#d7e84a]"
                          : "border-[#474835] bg-[#1a1a1a] text-[#c8c8af] hover:border-[#91927c]"
                      }`}
                    >
                      {level} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {filteredIssues.map(({ issue, index: issueIndex }) => {
                  const expanded = issueIndex === expandedIssueIndex;

                  return (
                    <article key={`${issue.comment}-${issueIndex}`} className="analysis-card rounded-lg overflow-hidden bg-[#1b1b1b]">
                      <div className="p-4 border-b border-[#474835]/60 bg-[#ff4d6d]/5">
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <div className="flex gap-2">
                            <span className={`px-2 py-0.5 text-[10px] rounded uppercase border font-bold ${severityClass[issue.severity]}`}>
                              {issue.severity}
                            </span>
                            {issue.mode_tags.slice(0, 1).map((mode) => (
                              <span
                                key={mode}
                                className="px-2 py-0.5 text-[10px] rounded uppercase border border-[#91927c] text-[#c8c8af]"
                              >
                                {mode.replace("_", " ")}
                              </span>
                            ))}
                          </div>

                          <span className="text-xs text-[#c8c8af]">
                            Lines {issue.line_start ?? "?"}-{issue.line_end ?? issue.line_start ?? "?"}
                          </span>
                        </div>

                        <h3 className="text-lg font-semibold">{issue.comment}</h3>
                      </div>

                      <div className="p-4 flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={() => setExpandedIssueIndex(expanded ? null : issueIndex)}
                          className="text-left text-[#bbcb2e] hover:underline flex items-center justify-between"
                        >
                          <span>Why this matters</span>
                          <span className={`material-symbols-outlined text-base transition-transform ${expanded ? "rotate-180" : ""}`}>
                            expand_more
                          </span>
                        </button>

                        {expanded && (
                          <div className="space-y-2 text-sm text-[#c8c8af]">
                            <p>
                              <strong className="text-[#e2e2e2]">What is wrong:</strong> {issue.why_this_matters.what_is_wrong}
                            </p>
                            <p>
                              <strong className="text-[#e2e2e2]">Why it matters:</strong> {issue.why_this_matters.why_it_matters}
                            </p>
                            <p>
                              <strong className="text-[#e2e2e2]">How to fix:</strong> {issue.why_this_matters.how_to_fix}
                            </p>
                          </div>
                        )}

                        {issue.suggested_fix && (
                          <div className="mt-1">
                            <span className="text-xs uppercase text-[#c8c8af] block mb-2">Suggested Fix</span>
                            <pre className="bg-[#000000] p-3 rounded border border-[#474835] font-mono text-[#1DCD9F] overflow-x-auto whitespace-pre-wrap wrap-break-word text-sm">
                              {issue.suggested_fix}
                            </pre>
                          </div>
                        )}

                        <div className="mt-2 flex justify-end gap-2">
                          {issue.suggested_fix && (
                            <button
                              type="button"
                              onClick={() => copySuggestedFix(issue.suggested_fix || "", issueIndex)}
                              className="px-3 py-2 rounded border border-[#474835] bg-[#0f0f0f] text-[#c8c8af] hover:text-[#e2e2e2] text-xs"
                            >
                              {copiedIssueIndex === issueIndex ? "Copied" : "Copy Fix"}
                            </button>
                          )}
                          <button className="px-3 py-2 text-[#c8c8af] hover:text-[#e2e2e2] text-xs">Dismiss</button>
                          <button className="px-3 py-2 rounded bg-[#bbcb2e] text-[#000000] font-bold text-xs hover:bg-[#d7e84a]">
                            Apply Fix
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {!filteredIssues.length && (
                  <div className="rounded border border-[#474835] bg-[#1b1b1b] p-4 text-[#c8c8af] text-sm">
                    {loading
                      ? "Analyzing code..."
                      : issues.length
                        ? "No issues match current severity filter."
                        : "No issues found for the selected file."}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {(loading || error) && (
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex items-center justify-center z-30">
          <div className="rounded border border-[#474835] bg-[#111111] px-6 py-4 text-center max-w-lg">
            {loading && (
              <>
                <p className="text-[#bbcb2e] font-semibold mb-1">Review in progress...</p>
                <p className="text-sm text-[#c8c8af] capitalize">
                  Current status: {statusData?.status || "queued"}
                </p>
              </>
            )}
            {!loading && error && (
              <>
                <p className="text-[#ff4d6d] font-semibold mb-1">Unable to load review</p>
                <p className="text-sm text-[#c8c8af] whitespace-pre-wrap wrap-break-word">{error}</p>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .file-list-item {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .file-list-item:hover {
          transform: translateX(4px);
          box-shadow: -2px 0 8px rgba(187, 203, 46, 0.2);
        }
        .analysis-card {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid #ff4d6d;
        }
        .analysis-card:hover {
          border-color: #bbcb2e;
          box-shadow: 0 4px 12px rgba(187, 203, 46, 0.12);
        }
        .issue-highlight {
          background-color: rgba(220, 20, 60, 0.14);
          border-left: 2px solid #ff2f57;
        }
        .scan-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(to right, transparent, rgba(187, 203, 46, 0.5), transparent);
          box-shadow: 0 0 10px rgba(187, 203, 46, 0.5);
          animation: scanLine 3s linear infinite;
          pointer-events: none;
          z-index: 5;
        }
        .animate-slide-left {
          animation: slideInLeft 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-slide-right {
          animation: slideInRight 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-fade-scale {
          animation: fadeInScale 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.985);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes scanLine {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100vh);
          }
        }
      `}</style>
    </div>
  );
}
