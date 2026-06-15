export default function HomePage() {
  return (
    <>
      {/* Background Atmosphere */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-grid" />
      </div>

      {/* TopNavBar */}
      <nav className="fixed top-0 z-50 h-16 w-full bg-black/60 backdrop-blur-xl border-b border-white/20 flex justify-between items-center px-6 animate-fade-in-up">
        <div className="flex items-center gap-6">
          <span className="text-[#bbcb2e] tracking-tight text-3xl font-bold">DiffLens</span>
          <div className="hidden md:flex gap-4 text-sm">
            <a className="text-[#bbcb2e] font-bold border-b-2 border-[#bbcb2e] pb-1" href="#">
              Dashboard
            </a>
            <a className="text-[#dddddd] hover:text-white transition-colors" href="#">
              Reviews
            </a>
            <a className="text-[#dddddd] hover:text-white transition-colors" href="#">
              Docs
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="hidden md:flex items-center gap-1 px-4 py-2 bg-[#bbcb2e] text-black text-xs font-semibold rounded-sm active:scale-95 duration-200">
            New Review
          </button>
          <span className="material-symbols-outlined text-[#dddddd] cursor-pointer hover:text-white transition-all">
            notifications
          </span>
          <span className="material-symbols-outlined text-[#dddddd] cursor-pointer hover:text-white transition-all">
            settings
          </span>
          <img
            alt="User Profile"
            className="w-8 h-8 rounded-full border border-white/20"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXbwkWiS-Hjyl0GN44zgXSYzURRxUwjFdsl_kU6cbeX9WeM6FKdlIbbk3uWs8-uzgsrKZwz0qci_k-w_SI0a3AdKcgzi6wUCuoyg0KOKZ6Au1gyxh-YfNTsc4kVpvyzlFFFzYyty9Hwuj41LhUHH2PkxyTtnYKU6ybsRiln_yonWMSCHj3VDpehBzO3J7vn55U1eSWd8-t744rzu1Hc33hvJNk5IzHtscZ3luFUchphQowAKdaTgBWTrZ3yxNNlVdX8mBeS9zJF2c"
          />
        </div>
      </nav>

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[920px] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#bbcb2e]/10 rounded-full blur-[120px]" />
          </div>

          <div className="relative z-10 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 glass-panel rounded-full text-[#bbcb2e] text-xs border border-[#bbcb2e]/20 animate-fade-in-up delay-100">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              <span>AI-POWERED ANALYSIS ENGINE v2.0</span>
            </div>

            <h1 className="text-5xl md:text-7xl text-white leading-tight mb-4 font-semibold animate-fade-in-up delay-200">
              Instant <span className="text-[#bbcb2e]">pre-PR</span> code reviews
            </h1>

            <p className="text-base md:text-lg text-[#dddddd] max-w-2xl mx-auto mb-12 animate-fade-in-up delay-300">
              DiffLens automates technical debt discovery. Stop wasting senior engineering time on syntax
              and security basics. Ship faster with obsidian-sharp precision.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-fade-in-up delay-400">
              <button className="w-full md:w-auto px-12 py-4 bg-[#bbcb2e] text-black text-2xl font-semibold rounded-lg hover:brightness-110 transition-all active:scale-95 crimson-glow shimmer-btn">
                Start for free
              </button>
              <button className="w-full md:w-auto px-12 py-4 bg-black border border-white/40 text-white text-2xl font-semibold rounded-lg hover:border-[#bbcb2e] transition-all active:scale-95 shimmer-btn">
                View Demo
              </button>
            </div>
          </div>

          {/* Bento */}
          <div className="relative z-10 w-full max-w-7xl mt-12 grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-[200px]">
            <div className="md:col-span-8 md:row-span-2 glass-panel rounded-xl overflow-hidden flex flex-col border border-white/20 scanner-effect animate-fade-in-up delay-100">
              <div className="h-10 flex items-center px-4 border-b border-white/20 gap-2 bg-[#131313]">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/50" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                  <div className="w-2 h-2 rounded-full bg-green-500/50" />
                </div>
                <span className="text-xs text-[#dddddd]">auth_provider.py</span>
              </div>

              <div className="flex-1 p-4 text-sm overflow-hidden bg-black text-white">
                <div className="flex gap-4 py-0.5 opacity-40">
                  <span className="w-8 text-right shrink-0">12</span>
                  <span>def validate_user(token):</span>
                </div>
                <div className="flex gap-4 py-0.5 diff-removed">
                  <span className="w-8 text-right shrink-0 text-[#dc143c]">- 13</span>
                  <span>payload = jwt.decode(token, "SECRET", algorithms=["HS256"])</span>
                </div>
                <div className="flex gap-4 py-0.5 diff-added">
                  <span className="w-8 text-right shrink-0 text-[#1DCD9F]">+ 13</span>
                  <span>payload = jwt.decode(token, os.environ.get("JWT_SECRET"), algorithms=["HS256"])</span>
                </div>

                <div className="mt-4 p-4 bg-[#dc143c]/10 border-l-4 border-[#dc143c] rounded-sm text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="material-symbols-outlined text-[#dc143c] text-[18px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      security
                    </span>
                    <span className="text-xs font-bold text-[#dc143c]">Security Alert</span>
                  </div>
                  <p className="text-[#dddddd] text-sm">
                    Hardcoded secret detected. Replaced with environment variable fetch for production
                    compliance.
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-4 md:row-span-1 glass-panel rounded-xl p-6 flex flex-col justify-between border border-white/20 animate-fade-in-up delay-200">
              <span className="material-symbols-outlined text-[#1DCD9F] text-3xl">bolt</span>
              <div>
                <div className="text-6xl text-white">0.4s</div>
                <div className="text-xs text-[#dddddd]">Average analysis latency</div>
              </div>
            </div>

            <div className="md:col-span-4 md:row-span-1 glass-panel rounded-xl p-6 flex flex-col justify-between bg-[#131313] border border-white/20 animate-fade-in-up delay-300">
              <div className="flex -space-x-2">
                <div className="w-10 h-10 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm text-white">code</span>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm text-white">terminal</span>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm text-white">hub</span>
                </div>
              </div>
              <div>
                <div className="text-3xl text-white font-semibold">Integrated</div>
                <p className="text-sm text-[#dddddd]">GitHub, GitLab &amp; Azure DevOps</p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="py-12 border-t border-white/20 bg-[#131313]">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-xs text-[#dddddd] mb-8 tracking-widest">TRUSTED BY TEAMS AT SCALE</p>
            <div className="flex flex-wrap justify-center items-center gap-10 opacity-30 grayscale contrast-125 text-4xl font-bold text-white">
              <div>STARK_INDUSTRIES</div>
              <div>WAYNE_TECH</div>
              <div>OSCORP_ENG</div>
              <div>UMBRELLA_CORP</div>
              <div>CYBERDYNE</div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-12 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: "radar",
              title: "Structural Diffing",
              text: "Analyze code logic, not just text changes. We detect moved block and refactored variables across files.",
            },
            {
              icon: "lock",
              title: "Zero-Trust Privacy",
              text: "Your code never leaves your VPC. DiffLens processes metadata and temporary chunks with end-to-end encryption.",
            },
            {
              icon: "psychology",
              title: "Contextual AI",
              text: "Trained on 10M+ open source commits, our engine understands the ‘intent’ behind your changes.",
            },
          ].map((item) => (
            <div key={item.title} className="p-6 rounded-xl glass-panel border border-white/20 hover-scale group">
              <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center mb-4 group-hover:bg-[#bbcb2e] transition-colors">
                <span className="material-symbols-outlined text-white group-hover:text-black icon-glow">
                  {item.icon}
                </span>
              </div>
              <h3 className="text-3xl text-white mb-2 font-semibold">{item.title}</h3>
              <p className="text-sm text-[#dddddd]">{item.text}</p>
            </div>
          ))}
        </section>

        {/* CTA Image */}
        <section className="py-12 px-6">
          <div className="max-w-7xl mx-auto h-[500px] rounded-3xl overflow-hidden relative group">
            <img
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSjdCqWGkxk4EI8BWqwwa1gxQ8sULFRmnaJNqi-As-lxfXULXoUrdgIGM-_mkhgjzZqN9Pvej_wNHJgIjorAebw6EShHq45FaUldOUOxUfLmxs6EFe1ktBDPxHRr6JC7931RL6NvVE1vOhnX6Rkq6my6bSRjv7-PHKXKfDSEf_HtRA8QDyp81qcqpFq2ZClINi23DbOK_bIdYFaGlI1mPbCgsOGxBQCtbCvJ6UWecEhUIxZp4JYuVnvpD4oNGbpiKXn1T4nnFDDdc"
              alt="Dark server room"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex items-end p-12">
              <div className="max-w-xl">
                <h2 className="text-6xl text-white mb-4 font-semibold">Ready to eliminate technical debt?</h2>
                <button className="px-12 py-4 bg-[#bbcb2e] text-black text-2xl font-semibold rounded-sm active:scale-95 transition-all shimmer-btn">
                  Get Started Now
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-white/20 bg-[#131313]">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 gap-4">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="text-sm text-[#bbcb2e]">DiffLens // CLI_v1.0.4</span>
            <span className="text-xs text-[#dddddd]">© 2024 DiffLens. Engineering Excellence.</span>
          </div>
          <div className="flex gap-6 text-xs">
            {["Privacy", "Terms", "Security", "Status"].map((item) => (
              <a
                key={item}
                className="text-[#dddddd] hover:text-white transition-colors opacity-80 hover:opacity-100"
                href="#"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}
