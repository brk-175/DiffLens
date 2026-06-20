"use client";
import { useMemo, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";


type UiMode = "generic" | "bug" | "security" | "performance" | "maintainability";
type ApiMode = "generic" | "bug_hunter" | "security" | "performance" | "maintainability";

type CreateReviewResponse = {
  review_id: number;
  guest_token: string;
  status: "queued" | "processing" | "complete" | "failed";
  input_blob_path: string;
};

const UI_TO_API_MODE: Record<UiMode, ApiMode> = {
  generic: "generic",
  bug: "bug_hunter",
  security: "security",
  performance: "performance",
  maintainability: "maintainability",
};

function saveGuestToken(reviewId: number, guestToken: string) {
  if (typeof window === "undefined") return;
  const key = "difflens_guest_review_tokens";

  const currentRaw = window.localStorage.getItem(key);
  const current: Record<string, string> = currentRaw ? JSON.parse(currentRaw) : {};
  current[String(reviewId)] = guestToken;
  window.localStorage.setItem(key, JSON.stringify(current));
}

export default function UploadPage() {
  const router = useRouter();
  const apiBase = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/$/, ""),
    []
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedMode, setSelectedMode] = useState<UiMode>("generic");
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [diffText, setDiffText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [mouse, setMouse] = useState({ x: -1000, y: -1000, active: false });
  
  const activeFile = files.length > 0 ? files[0] : null;
  const hasInput = Boolean(activeFile || diffText.trim());

  const readFileText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Unable to read selected file."));
      reader.readAsText(file);
    });

  const onFilesSelected = (nextFiles: FileList | null) => {
    if (!nextFiles || nextFiles.length === 0) return;
    setError("");
    setFiles(Array.from(nextFiles));
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    onFilesSelected(e.dataTransfer.files);
  };

  const onGenerateReview = async () => {
    setError("");

    try {
      setIsSubmitting(true);

      const token = typeof window !== "undefined" ? window.localStorage.getItem("difflens_access_token") : null;

      let diffContent = diffText;
      let sourceType: "pasted" | "uploaded" = "pasted";
      let fileName: string | undefined;

      if (activeFile) {
        sourceType = "uploaded";
        fileName = activeFile.name;
        diffContent = await readFileText(activeFile);
      }

      if (!diffContent.trim()) {
        throw new Error("Please upload a file or paste raw diff before generating review.");
      }

      const response = await fetch(`${apiBase}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          diff_content: diffContent,
          modes: [UI_TO_API_MODE[selectedMode]],
          source_type: sourceType,
          ...(fileName ? { file_name: fileName } : {}),
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to create review.");
      }

      const data: CreateReviewResponse = await response.json();

      if (!token && data.guest_token) {
        saveGuestToken(data.review_id, data.guest_token);
      }

      router.push(`/review/${data.review_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startGoogle = () => {
    window.location.href = `${apiBase}/auth/google/login`;
  };

  return (
    <div
      className="bg-black text-[#dddddd] min-h-screen overflow-x-hidden relative"
      onMouseMove={(e) => setMouse({ x: e.clientX, y: e.clientY, active: true })}
      onMouseLeave={() => setMouse((prev) => ({ ...prev, active: false }))}
    >
      <div
        className="pointer-events-none fixed w-[600px] h-[600px] rounded-full z-[-5] transition-opacity duration-300"
        style={{
          left: mouse.x,
          top: mouse.y,
          transform: "translate(-50%, -50%)",
          opacity: mouse.active ? 1 : 0,
          background: "radial-gradient(circle, rgba(187,203,46,0.06) 0%, transparent 60%)",
        }}
      />

      <header className="flex justify-between items-center w-full px-4 md:px-8 h-16 sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-[#bbcb2e]/30">
        <div className="flex items-center gap-8">
          <a className="text-[#bbcb2e] text-[20px] font-bold tracking-[-0.02em] cursor-pointer" onClick={() => router.push('/')}>
            DiffLens
          </a>
          <nav className="hidden md:flex gap-6">
            <a className="text-[12px] leading-[12px] tracking-[0.05em] text-[#dddddd]/70 hover:text-[#bbcb2e] transition-colors" href="#">
              Review History
            </a>
            <a className="text-[12px] leading-[12px] tracking-[0.05em] text-[#dddddd]/70 hover:text-[#bbcb2e] transition-colors" href="#">
              Documentation
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <a
            className="text-[12px] leading-[12px] tracking-[0.05em] text-[#dddddd]/70 hover:text-[#bbcb2e] transition-colors px-4 py-2 active:scale-95 hover:bg-white/10 hover:text-[#C9D532] cursor-pointer"
            onClick={() => router.push("/signin")}
          >
            Sign In
          </a>
          <a className="bg-[#bbcb2e] text-black px-6 py-2 text-[12px] leading-[12px] tracking-[0.05em] rounded-lg hover:brightness-110 transition-all duration-200 active:scale-95" href="#">
            Get Started
          </a>
        </div>
      </header>

      <main className="min-h-screen relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#bbcb2e]/10 blur-[120px] -z-10 rounded-full opacity-20" />

        <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-12 flex flex-col gap-12">
          <div className="flex flex-col gap-2 max-w-2xl">
            <h1 className="text-white text-[48px] leading-[1.1] tracking-[-0.04em] font-bold animate-fade-in-up delay-100">
              Initiate Code Intelligence.
            </h1>
            <p className="text-[16px] leading-[1.6] tracking-[-0.01em] text-[#dddddd] animate-fade-in-up delay-200">
              Upload or Paste <span className="text-[#bbcb2e]">.diff</span> or <span className="text-[#bbcb2e]">.patch</span> file to begin an AI-augmented high-fidelity review. Select a focus mode to tailor the analysis.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 flex flex-col gap-8">
              <div
                id="dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`relative group cursor-pointer border-2 border-dashed bg-black h-64 flex flex-col items-center justify-center gap-4 rounded-xl transition-all duration-300 ${
                  dragOver
                    ? "border-[#bbcb2e] bg-[#bbcb2e]/5 shadow-[0_0_20px_rgba(187,203,46,0.1)]"
                    : "border-[#dddddd]/30 animate-breathe hover:border-[#bbcb2e] hover:bg-[#bbcb2e]/5 hover:shadow-[0_0_20px_rgba(187,203,46,0.1)]"
                }`}
              >
                <div className="flex items-center justify-center w-16 h-16 rounded-full border border-[#bbcb2e]/20 bg-[#bbcb2e]/10 transition-all duration-300 group-hover:bg-[#bbcb2e]/20 group-hover:scale-110 group-hover:border-[#bbcb2e]/40">
                  <span className="material-symbols-outlined text-[#bbcb2e] text-3xl">upload_file</span>
                </div>

                <div className="text-center">
                  <p className="text-white text-[20px] leading-[1.4] tracking-[-0.01em] font-semibold">
                    {activeFile ? activeFile.name : "Drag and drop files"}
                  </p>
                  <p className="text-[#dddddd] text-[16px] leading-[1.5]">
                    {activeFile ? "File ready for review" : <>or <span className="text-[#bbcb2e]">browse your computer</span></>}
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  multiple
                  type="file"
                  onChange={(e) => onFilesSelected(e.target.files)}
                />
              </div>

              <p className="text-[14px] leading-[1.5] text-[#dddddd]/50 px-1 mt-[-20px]">
                Max file size: 25MB
              </p>

              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[12px] leading-[12px] tracking-[0.05em] font-bold text-[#bbcb2e]/80">
                    OR PASTE RAW DIFF / PATCH
                  </label>
                </div>

                <div className="relative overflow-hidden rounded-xl w-full h-80">
                  <textarea
                    className="absolute inset-0 w-full h-full bg-black border-1 border-[#bbcb2e]/30 text-white rounded-xl p-4 focus:ring-2 focus:ring-[#bbcb2e] transition-all placeholder:text-[#dddddd]/40 font-mono text-[14px] leading-[1.6]"
                    placeholder="Paste your git diff or source code here..."
                    value={diffText}
                    onChange={(e) => {
                      setDiffText(e.target.value);
                      if (files.length > 0) setFiles([]);
                    }}
                  />
                  <div className="scan-line-upload" />
                </div>

                <div className="flex justify-between items-center px-1">
                  <p className="text-[14px] leading-[1.5] text-[#dddddd]/50">
                    Supports .diff and .patch
                  </p>
                </div>

                {files.length > 1 && (
                  <p className="px-1 text-[12px] leading-normal text-[#dddddd]/60">
                    Multiple files selected. Current backend flow processes the first file for one review.
                  </p>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <h2 className="text-[12px] leading-3 tracking-wider font-bold text-[#dddddd]/60">
                  REVIEW FOCUS MODE
                </h2>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    {
                      key: "generic",
                      icon: "auto_awesome",
                      title: "Generic",
                      text: "Balanced analysis of logic, style, and structure.",
                    },
                    {
                      key: "bug",
                      icon: "pest_control",
                      title: "Bug Hunter",
                      text: "Deep scan for edge cases and logical fallacies.",
                    },
                    {
                      key: "security",
                      icon: "shield",
                      title: "Security",
                      text: "Vulnerability detection and OWASP compliance.",
                    },
                    {
                      key: "performance",
                      icon: "speed",
                      title: "Performance",
                      text: "Identify bottlenecks and memory leak risks.",
                    },
                    {
                      key: "maintainability",
                      icon: "architecture",
                      title: "Maintainability",
                      text: "Code smells, complexity, and documentation.",
                    },
                  ].map((item) => {
                    const isActive = selectedMode === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setSelectedMode(item.key as UiMode)}
                        className={`group cursor-grab active:cursor-grabbing text-left p-4 bg-black rounded-xl flex items-center gap-4 transition-all duration-300 hover:scale-[1.02] hover:border-[#bbcb2e] hover:bg-[#bbcb2e]/5 hover:shadow-[0_0_15px_rgba(187,203,46,0.15)] active:scale-[0.98] border ${
                          isActive
                            ? "border-[#bbcb2e] shadow-[0_0_15px_rgba(187,203,46,0.15)]"
                            : "border-[#dddddd]/30"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300 border ${
                            isActive
                              ? "border-[#bbcb2e]/30 text-[#bbcb2e] bg-[#bbcb2e]/10"
                              : "border-[#dddddd]/20 text-[#dddddd] group-hover:text-[#bbcb2e] group-hover:bg-[#bbcb2e]/10 group-hover:border-[#bbcb2e]/30"
                          }`}
                        >
                          <span className="material-symbols-outlined">{item.icon}</span>
                        </div>
                        <div>
                          <h3 className="text-white text-[20px] leading-[1.4] tracking-[-0.01em] font-semibold">
                            {item.title}
                          </h3>
                          <p className="text-[#dddddd]/70 text-[14px] leading-normal">{item.text}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-4 mt-auto">
                <button
                  type="button"
                  onClick={onGenerateReview}
                  disabled={isSubmitting || !hasInput}
                  className="w-full bg-[#bbcb2e] text-black text-[20px] leading-[1.4] tracking-[-0.01em] font-bold py-5 rounded-xl transition-all duration-200 hover:brightness-110 active:scale-95 shadow-[0px_4px_20px_rgba(187,203,46,0.25)] flex items-center justify-center gap-3 btn-pulse disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="material-symbols-outlined">bolt</span>
                  {isSubmitting ? "Generating..." : "Generate Review"}
                </button>

                {error && <p className="text-[#ffb4ab] text-sm">{error}</p>}

                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-[#dddddd]/20" />
                  <span className="text-[12px] leading-3 tracking-wider font-bold text-[#dddddd]/50">
                    ALTERNATIVE
                  </span>
                  <div className="h-px flex-1 bg-[#dddddd]/20" />
                </div>

                <button
                  type="button"
                  onClick={startGoogle}
                  className="w-full bg-transparent border border-[#dddddd]/30 text-white text-[16px] leading-[1.6] py-4 rounded-xl transition-all hover:bg-[#dddddd]/10 hover:border-[#dddddd] flex items-center justify-center gap-3 active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-12 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-black border-t border-[#dddddd]/20">
  <p className="text-[14px] leading-normal text-[#dddddd]/50">© 2026 DiffLens AI. High-fidelity code review intelligence.</p>
        <div className="flex gap-6 flex-wrap justify-center">
          <a className="text-[12px] leading-3 tracking-wider text-[#dddddd]/60 hover:text-white transition-colors" href="#">
            Privacy Policy
          </a>
          <a className="text-[12px] leading-3 tracking-wider text-[#dddddd]/60 hover:text-white transition-colors" href="#">
            Terms of Service
          </a>
          <a className="text-[12px] leading-[12px] tracking-[0.05em] text-[#dddddd]/60 hover:text-white transition-colors" href="#">
            Security
          </a>
          <a className="text-[12px] leading-[12px] tracking-[0.05em] text-[#dddddd]/60 hover:text-white transition-colors" href="#">
            Status
          </a>
          <a className="text-[12px] leading-[12px] tracking-[0.05em] text-[#dddddd]/60 hover:text-white transition-colors" href="#">
            API
          </a>
        </div>
      </footer>

      <style jsx global>{`
        .animate-fade-in-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .delay-100 {
          animation-delay: 100ms;
        }
        .delay-200 {
          animation-delay: 200ms;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes breathe {
          0%,
          100% {
            border-color: rgba(221, 221, 221, 0.3);
          }
          50% {
            border-color: rgba(187, 203, 46, 0.5);
          }
        }
        .animate-breathe {
          animation: breathe 3s ease-in-out infinite;
        }

        @keyframes pulseButton {
          0% {
            box-shadow: 0 0 0 0 rgba(187, 203, 46, 0.4);
          }
          70% {
            box-shadow: 0 0 0 15px rgba(187, 203, 46, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(187, 203, 46, 0);
          }
        }
        .btn-pulse {
          animation: pulseButton 2.5s infinite;
        }

        @keyframes scanLine {
          0% {
            top: 0;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }
        .scan-line-upload {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(to right, transparent, rgba(187, 203, 46, 0.6), transparent);
          box-shadow: 0 0 8px rgba(187, 203, 46, 0.4);
          animation: scanLine 3s linear infinite;
          pointer-events: none;
          z-index: 10;
        }

        ::selection {
          background-color: #bbcb2e;
          color: #000000;
        }
      `}</style>
    </div>
  );
}
