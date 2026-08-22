"use client";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="...">...</header>
      <main className="relative z-10">
        <section className="...">
          <div className="max-w-5xl mx-auto glass-panel p-12 md:p-32 rounded-[2rem] text-center relative overflow-hidden reveal">
            <div className="absolute inset-0 bg-[#bbcb2e]/5 pointer-events-none"></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-7xl font-bold tracking-tight mb-6">
                Ready to eliminate <br />
                <span className="text-[#bbcb2e] italic">technical debt?</span>
              </h2>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                <button className="w-full md:w-auto px-12 py-4 bg-[#bbcb2e] text-black font-bold text-lg rounded shadow-xl shadow-[#bbcb2e]/20 btn-glow-hover cursor-pointer" onClick={() => router.push("/upload")}>
                  Start Reviewing
                </button>
              </div>
              <p className="mt-6 text-white/40 text-sm font-medium">
                Paste / upload a diff file. Get actionable insights in seconds.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="relative z-10 py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="text-2xl font-bold tracking-tighter text-[#bbcb2e]">DiffLens</span>
            <span className="text-xs text-white/30 u</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
