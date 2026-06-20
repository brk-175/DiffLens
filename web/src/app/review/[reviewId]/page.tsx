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
        setExpandedIssueIndex(0);
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

  const criticalCount = useMemo(
    () => issues.filter((issue) => issue.severity === "critical").length,
    [issues]
  );

  const headerSummary =
    resultData?.summary.short_summary ||
    statusData?.short_summary ||
    "Automated code review is processing your diff. Results will appear as soon as analysis completes.";

  const verdict = resultData?.summary.overall_verdict || statusData?.overall_verdict;
  const riskLevel = resultData?.summary.risk_level || statusData?.risk_level || "pending";
  const hasDetailedSummary = Boolean(resultData?.files?.length || resultData?.final_summary?.key_takeaways?.length);

  return (
    <div className="bg-[#000000] text-[#e2e2e2] h-screen flex flex-col overflow-hidden relative pt-20">
      <canvas id="review-canvas-bg" className="absolute inset-0 w-full h-full -z-10 opacity-30 pointer-events-none" />

      <header className="border-b border-[#474835] bg-[#000000]/90 backdrop-blur-md px-6 py-5 flex flex-col gap-4 z-10">
        <div className="flex justify-between items-start gap-4">
          <div className="flex flex-col gap-2 max-w-4xl">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">Analysis Report : PR - {reviewId}</h1>
            </div>
            <p className="text-[#c8c8af] text-sm leading-6">{headerSummary}</p>
          </div>

          <div className="flex gap-3">
            <div className="min-w-36 border border-[#ff4d6d] rounded p-2 bg-[#000000]">
              <p className="text-[11px] tracking-widest uppercase text-[#c8c8af] mb-1">Overall Verdict</p>
              <p className="text-[#ff4d6d] font-semibold">{verdictDisplay(verdict)}</p>
            </div>

            <div className="min-w-36 border border-[#ff4d6d] rounded p-2 bg-[#000000]">
              <p className="text-[11px] tracking-widest uppercase text-[#c8c8af] mb-1">Risk Level</p>
              <p className="text-[#ff4d6d] font-semibold capitalize">{riskLevel}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#474835] bg-[#0b0f03]/70 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsSummaryExpanded((prev) => !prev)}
            className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#bbcb2e]/8 transition-colors"
            aria-expanded={isSummaryExpanded}
            aria-controls="diff-summary-panel"
          >
            <div className="flex items-center gap-3 text-left">
              <span className="material-symbols-outlined text-[#bbcb2e]">summarize</span>
              <div>
                <p className="text-xs uppercase tracking-widest text-[#c8c8af]">Diff Summary</p>
                <p className="text-sm text-[#e2e2e2]">
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

          {isSummaryExpanded && (
            <div id="diff-summary-panel" className="border-t border-[#474835] px-4 py-4 space-y-4 summary-expand">
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
                          setExpandedIssueIndex(0);
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
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden z-10">
        <aside className="w-64 border-r border-[#474835] bg-[#000000]/90 backdrop-blur-md flex flex-col animate-slide-left">
          <div className="p-4 border-b border-[#474835]">
            <h2 className="text-xs uppercase tracking-widest text-[#c8c8af]">Files Reviewed</h2>
          </div>

          <nav className="flex-1 overflow-y-auto py-2">
            {files.map((file, i) => {
              const fileIssues = file.issues.length;
              const active = i === selectedFileIndex;
              return (
                <button
                  key={`${file.file_path}-${i}`}
                  type="button"
                  onClick={() => {
                    setSelectedFileIndex(i);
                    setExpandedIssueIndex(0);
                  }}
                  className={`w-full text-left flex items-center gap-2 px-4 py-2 border-l-2 transition-all file-list-item ${
                    active
                      ? "border-[#bbcb2e] bg-[#bbcb2e]/10 text-[#bbcb2e]"
                      : "border-transparent text-[#c8c8af] hover:text-[#e2e2e2]"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">description</span>
                  <span className="font-mono text-sm truncate">{file.file_path}</span>
                  {fileIssues > 0 && <span className="ml-auto w-2 h-2 rounded-full bg-[#ff4d6d]" />}
                </button>
              );
            })}

            {!files.length && (
              <div className="px-4 py-3 text-sm text-[#c8c8af]">No analyzed files yet.</div>
            )}
          </nav>
        </aside>

        <main className="flex-1 bg-[#000000]/80 flex flex-col overflow-hidden relative animate-fade-scale">
          <div className="scan-line" />

          <div className="h-10 border-b border-[#474835] flex items-center px-4 gap-4 bg-[#0e0e0e] shrink-0 z-10 relative">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">code</span>
              <span className="font-mono text-sm">{selectedFile?.file_path || "No file selected"}</span>
            </div>
            <div className="h-full border-r border-[#474835]" />
            <span className="font-mono text-sm text-[#c8c8af]/80">DiffLens Render</span>
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
                      <span className="ml-3 inline-flex px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-[#ff2f57] text-white align-middle">
                        Issue Detected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        <aside className="w-96 border-l border-[#474835] bg-[#000000]/90 backdrop-blur-md flex flex-col z-10 animate-slide-right">
          <div className="p-4 border-b border-[#474835] bg-[#0e0e0e] shrink-0 flex justify-between items-center">
            <h2 className="text-xs uppercase tracking-widest">Analysis Results ({issues.length})</h2>
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] rounded border border-[#ff4d6d]/30 bg-[#ff4d6d]/20 text-[#ff4d6d] font-bold">
                {criticalCount} Critical
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {issues.map((issue, idx) => {
              const expanded = idx === expandedIssueIndex;

              return (
                <article key={`${issue.comment}-${idx}`} className="analysis-card rounded-lg overflow-hidden bg-[#1b1b1b]">
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
                      onClick={() => setExpandedIssueIndex(expanded ? null : idx)}
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

                    <div className="mt-2 flex justify-end gap-3">
                      <button className="px-4 py-2 text-[#c8c8af] hover:text-[#e2e2e2] text-sm">Dismiss</button>
                      <button className="px-4 py-2 rounded bg-[#bbcb2e] text-[#000000] font-bold text-sm hover:bg-[#d7e84a]">
                        Apply Fix
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {!issues.length && (
              <div className="rounded border border-[#474835] bg-[#1b1b1b] p-4 text-[#c8c8af] text-sm">
                {loading ? "Analyzing code..." : "No issues found for the selected file."}
              </div>
            )}
          </div>
        </aside>
      </div>

      <footer className="bg-[#0e0e0e]/95 backdrop-blur-md border-t border-[#474835] w-full px-4 py-3 flex justify-between items-center z-20 shrink-0 gap-6">
        <div className="flex flex-col min-w-0">
          <h4 className="font-semibold mb-1">Key Takeaways</h4>
          <p className="text-sm text-[#c8c8af] truncate">
            {resultData?.final_summary.key_takeaways.join(" • ") || "Analysis in progress. Please wait..."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-[#c8c8af] max-w-xl hidden xl:block">
            {resultData?.final_summary.recommended_next_steps.join(" • ") ||
              "Recommended: Address critical findings before proceeding."}
          </span>
          <button className="px-5 py-2 rounded border border-[#474835] bg-[#353535] text-[#e2e2e2] font-bold hover:bg-[#444444]">
            Reject PR
          </button>
          <button className="px-5 py-2 rounded bg-[#bbcb2e] text-[#1a1e00] font-bold hover:bg-[#d7e84a] inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">done_all</span>
            Apply All Safe Fixes
          </button>
        </div>
      </footer>

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
        .summary-expand {
          animation: summaryExpand 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          transform-origin: top;
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
        @keyframes summaryExpand {
          from {
            opacity: 0;
            transform: translateY(-6px) scaleY(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}
