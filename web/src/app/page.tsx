"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";


export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const canvas = document.getElementById("shader-canvas-ANIMATION_139") as HTMLCanvasElement | null;

    let cleanupGL: (() => void) | null = null;

    if (canvas) {
      const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;

      if (gl) {
        const syncSize = () => {
          const w = canvas.clientWidth || window.innerWidth || 1280;
          const h = canvas.clientHeight || window.innerHeight || 720;
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
        };

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(syncSize);
          resizeObserver.observe(canvas);
        }
        syncSize();

        const vs = `
          attribute vec2 a_position;
          varying vec2 v_texCoord;
          void main() {
            v_texCoord = a_position * 0.5 + 0.5;
            gl_Position = vec4(a_position, 0.0, 1.0);
          }
        `;

        const fs = `
          precision highp float;
          uniform float u_time;
          uniform vec2 u_resolution;
          uniform vec2 u_mouse;
          varying vec2 v_texCoord;

          void main() {
            vec2 uv = v_texCoord;
            vec2 grid = fract(uv * 40.0 + 0.1 * sin(u_time * 0.5));
            float line = smoothstep(0.0, 0.05, grid.x) * smoothstep(1.0, 0.95, grid.x) +
                        smoothstep(0.0, 0.05, grid.y) * smoothstep(1.0, 0.95, grid.y);

            vec2 mouse = u_mouse / u_resolution;
            float dist = distance(uv, mouse);
            float glow = smoothstep(0.2, 0.0, dist) * 0.15;
            float pulse = 0.02 * sin(u_time * 0.8 + uv.x * 5.0);

            vec3 lime = vec3(0.604, 0.749, 0.502);
            vec3 color = mix(vec3(0.01, 0.01, 0.01), lime, (glow + pulse) * line);

            gl_FragColor = vec4(color, 1.0);
          }
        `;

        const createShader = (type: number, source: string) => {
          const shader = gl.createShader(type);
          if (!shader) return null;
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gl.deleteShader(shader);
            return null;
          }
          return shader;
        };

        const vertexShader = createShader(gl.VERTEX_SHADER, vs);
        const fragmentShader = createShader(gl.FRAGMENT_SHADER, fs);

        if (vertexShader && fragmentShader) {
          const program = gl.createProgram();
          if (program) {
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

            if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
              gl.useProgram(program);

              const buf = gl.createBuffer();
              gl.bindBuffer(gl.ARRAY_BUFFER, buf);
              gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
                gl.STATIC_DRAW
              );

              const pos = gl.getAttribLocation(program, "a_position");
              gl.enableVertexAttribArray(pos);
              gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

              const uTime = gl.getUniformLocation(program, "u_time");
              const uRes = gl.getUniformLocation(program, "u_resolution");
              const uMouse = gl.getUniformLocation(program, "u_mouse");

              let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
              let rafId = 0;

              const onMouseMove = (event: MouseEvent) => {
                const rect = canvas.getBoundingClientRect();
                if (rect.width && rect.height) {
                  const nx = (event.clientX - rect.left) / rect.width;
                  const ny = 1.0 - (event.clientY - rect.top) / rect.height;
                  mouse.x = nx * canvas.width;
                  mouse.y = ny * canvas.height;
                }
              };

              window.addEventListener("mousemove", onMouseMove);

              const render = (time: number) => {
                if (!resizeObserver) syncSize();
                gl.viewport(0, 0, canvas.width, canvas.height);
                if (uTime) gl.uniform1f(uTime, time * 0.001);
                if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
                if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                rafId = requestAnimationFrame(render);
              };

              rafId = requestAnimationFrame(render);

              cleanupGL = () => {
                window.removeEventListener("mousemove", onMouseMove);
                cancelAnimationFrame(rafId);
                resizeObserver?.disconnect();
              };
            }
          }
        }
      }
    }

    const observerOptions: IntersectionObserverInit = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const animateValue = (el: HTMLElement) => {
      const end = parseFloat(el.getAttribute("data-count") || "0");
      const suffix = el.getAttribute("data-suffix") || "";
      const duration = 2000;
      let startTimestamp: number | null = null;

      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = progress * end;

        if (end % 1 !== 0) {
          el.innerText = `${current.toFixed(1)}${suffix}`;
        } else {
          el.innerText = `${Math.floor(current)}${suffix}`;
        }

        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          el.innerText = `${end}${suffix}`;
        }
      };

      window.requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const target = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          target.classList.add("active");
          if (target.classList.contains("metric-pulse") && target.dataset.animated !== "true") {
            target.dataset.animated = "true";
            animateValue(target);
          }
        }
      });
    }, observerOptions);

    document.querySelectorAll(".reveal, .code-reveal, .metric-pulse").forEach((el) => {
      observer.observe(el);
    });

    return () => {
      cleanupGL?.();
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <canvas id="shader-canvas-ANIMATION_139" />

      <main className="relative z-10">
        <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-12 px-6 overflow-hidden">
          <div className="relative z-10 max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 glass-panel rounded-full text-[11px] border-white/5 reveal">
              <span className="w-2 h-2 rounded-full bg-[#bbcb2e] animate-pulse"></span>
              <span className="uppercase tracking-widest text-[#bbcb2e]/80 font-[500]">
                AI PRE-PR REVIEW ENGINE
              </span>
            </div>

            <h1
              className="text-5xl md:text-8xl tracking-tight leading-[1.05] mb-6 reveal"
              style={{ transitionDelay: "0.1s" }}
            >
              <span className="text-[#bbcb2e]">Instant pre-PR</span>
              <br /> 
              <span>code reviews</span> 
              <br />
            </h1>

            <p
              className="max-w-3xl mx-auto text-lg md:text-xl text-white/60 mb-12 reveal"
              style={{ transitionDelay: "0.2s" }}
            >
              DiffLens analyzes code diffs before pull requests, uncovering bugs, security risks, performance issues, and maintainability concerns in seconds.
            </p>
          </div>

          <div className="relative w-full max-w-2xl mt-12 code-reveal">
            <div className="glass-panel rounded-xl overflow-hidden shadow-2xl border-white/10 relative">
              <div className="scan-line"></div>
              <div className="h-10 flex items-center px-4 border-b border-white/5 bg-black/40 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                </div>
                <span className="text-[11px] font-mono text-white/40">analyzer.ts</span>
              </div>

              <div className="p-6 font-mono text-[13px] leading-relaxed overflow-x-auto whitespace-nowrap">
                <div className="flex gap-4">
                  <span className="text-white/20 w-4">1</span>
                  <span>
                    <span className="syntax-keyword">async function</span>{" "}
                    <span className="syntax-function">analyzeDiff</span>(payload: DiffPayload) {"{"}
                  </span>
                </div>
                <div className="flex gap-4">
                  <span className="text-white/20 w-4">2</span>
                  <span>
                    <span className="syntax-keyword">const</span> issues ={" "}
                    <span className="syntax-keyword">await</span> engine.
                    <span className="syntax-function">scan</span>(payload);
                  </span>
                </div>
                <div className="flex gap-4">
                  <span className="text-white/20 w-4">3</span>
                  <span> </span>
                </div>
                <div className="flex gap-4">
                  <span className="text-white/20 w-4">4</span>
                  <span>
                    <span className="syntax-keyword">return</span> issues.
                    <span className="syntax-function">filter</span>(i =&gt; i.severity ==={" "}
                    <span className="syntax-string">&apos;CRITICAL&apos;</span>);
                  </span>
                </div>
                <div className="flex gap-4">
                  <span className="text-white/20 w-4">5</span>
                  <span>{"}"}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 relative px-6 max-w-6xl mx-auto">
          <div className="mb-12 text-center md:text-left">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 reveal">
              <span className="text-[#bbcb2e]"> Review smarter. </span> Ship faster.
            </h2>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 pt-12">
            <div className="flex flex-col gap-4 reveal" style={{ transitionDelay: "0.1s" }}>
              <div className="w-12 h-12 rounded-full bg-[#bbcb2e] text-black flex items-center justify-center font-bold text-lg mb-2 z-10 border-4 border-black">
                1
              </div>
              <h3 className="text-2xl font-semibold">Upload / Paste</h3>
              <p className="text-white/60 leading-relaxed">
                Paste or upload a git diff / patch file. DiffLens begins AI analysis and uncovers bugs, risks, and code quality issues instantly.
              </p>
            </div>

            <div className="flex flex-col gap-4 reveal" style={{ transitionDelay: "0.2s" }}>
              <div className="w-12 h-12 rounded-full bg-[#bbcb2e] text-black flex items-center justify-center font-bold text-lg mb-2 z-10 border-4 border-black">
                2
              </div>
              <h3 className="text-2xl font-semibold">AI Review</h3>
              <p className="text-white/60 leading-relaxed">
                AI scans your changes for bugs, security vulnerabilities, performance regressions, code smells, and maintainability issues.
              </p>
            </div>

            <div className="flex flex-col gap-4 reveal" style={{ transitionDelay: "0.3s" }}>
              <div className="w-12 h-12 rounded-full bg-[#bbcb2e] text-black flex items-center justify-center font-bold text-lg mb-2 z-10 border-4 border-black">
                3
              </div>
              <h3 className="text-2xl font-semibold">Fix & Merge</h3>
              <p className="text-white/60 leading-relaxed">
                Review prioritized findings, apply suggested fixes, and get your PR reviewed with greater confidence.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 px-6 bg-transparent">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              <div className="lg:col-span-5 md:sticky md:top-32">
                <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-4 reveal">
                  Deep semantic <br />
                  understanding
                </h2>
                <p className="text-white/50 text-lg mb-6 reveal">
                  DiffLens understands how your changes affect the surrounding codebase, surfacing issues that span files, modules, and execution paths before they reach production.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-2 reveal">
                    <span className="material-symbols-outlined text-[#bbcb2e] text-xl">check_circle</span>
                    <span>Security vulnerability detection</span>
                  </li>
                  <li className="flex items-center gap-2 reveal">
                    <span className="material-symbols-outlined text-[#bbcb2e] text-xl">check_circle</span>
                    <span>Cross-file impact analysis</span>
                  </li>
                  <li className="flex items-center gap-2 reveal">
                    <span className="material-symbols-outlined text-[#bbcb2e] text-xl">check_circle</span>
                    <span>Performance regression detection</span>
                  </li>
                </ul>
              </div>

              <div className="lg:col-span-7 code-reveal">
                <div className="glass-panel rounded-2xl overflow-hidden border-white/10 shadow-2xl relative group">
                  <div className="scan-line"></div>
                  <div className="h-10 flex items-center px-4 border-b border-white/5 bg-black/60 justify-between">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/30"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500/30"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500/30"></div>
                    </div>
                    <span className="text-[11px] font-mono text-white/30">middleware/auth.rs</span>
                  </div>

                  <div className="p-6 font-mono text-[13px] leading-relaxed overflow-x-auto bg-black/40">
                    <div className="flex gap-4 py-0.5">
                      <span className="text-white/20 w-8 text-right">42</span>
                      <span>
                        <span className="syntax-keyword">pub fn</span>{" "}
                        <span className="syntax-function">validate_request</span>(req: &amp;Request) -&gt;
                        Result&lt;()&gt; {"{"}
                      </span>
                    </div>
                    <div className="flex gap-4 py-0.5">
                      <span className="text-white/20 w-8 text-right">43</span>
                      <span>
                        {" "}
                        <span className="syntax-keyword">let</span> token = req.headers().get(
                        <span className="syntax-string">&quot;Authorization&quot;</span>)?;
                      </span>
                    </div>
                    <div className="flex gap-4 py-0.5 bg-red-500/10 border-l-2 border-red-500">
                      <span className="text-red-500/40 w-8 text-right">- 44</span>
                      <span>
                        {" "}
                        <span className="syntax-keyword">if</span> token =={" "}
                        <span className="syntax-string">&quot;admin_bypass&quot;</span> {"{"}{" "}
                        <span className="syntax-keyword">return</span> Ok(()); {"}"}
                      </span>
                    </div>
                    <div className="flex gap-4 py-0.5 bg-green-500/10 border-l-2 border-green-500">
                      <span className="text-green-500/40 w-8 text-right">+ 44</span>
                      <span>
                        {" "}
                        <span className="syntax-keyword">if</span>{" "}
                        <span className="syntax-function">secure_compare</span>(token, &amp;expected){" "}
                        {"{"} <span className="syntax-keyword">return</span> Ok(()); {"}"}
                      </span>
                    </div>
                    <div className="flex gap-4 py-0.5">
                      <span className="text-white/20 w-8 text-right">45</span>
                      <span> Err(AuthError::InvalidToken.into())</span>
                    </div>
                    <div className="flex gap-4 py-0.5">
                      <span className="text-white/20 w-8 text-right">46</span>
                      <span>{"}"}</span>
                    </div>
                  </div>

                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 glass-panel p-4 rounded-xl shadow-2xl border-[#bbcb2e]/20 reveal">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-[#bbcb2e] text-xl">security</span>
                      <span className="font-bold text-sm">Security Vulnerability</span>
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed mb-4">
                      Hardcoded bypass detected. This allows unauthorized access if the token matches a
                      static string. Replaced with constant-time comparison.
                    </p>
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 bg-[#bbcb2e] text-black text-[11px] font-bold rounded hover:scale-105 transition-transform">
                        Get Suggested Fix
                      </button>
                      <button className="flex-1 py-1.5 bg-white/10 text-white text-[11px] font-bold rounded hover:bg-white/20 transition-colors">
                        Ignore
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* <section className="py-12 px-6">
          <div className="max-w-7xl mx-auto border-y border-white/5 py-12 grid grid-cols-2 md:grid-cols-4 gap-12">
            <div className="text-center reveal" style={{ transitionDelay: "0.1s" }}>
              <div
                className="text-4xl md:text-6xl font-bold mb-2 text-[#bbcb2e] tracking-tighter metric-pulse"
                data-count="0.4"
                data-suffix="s"
              >
                0.0s
              </div>
              <div className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">
                Median Latency
              </div>
            </div>
            <div className="text-center reveal" style={{ transitionDelay: "0.2s" }}>
              <div
                className="text-4xl md:text-6xl font-bold mb-2 text-white tracking-tighter metric-pulse"
                data-count="12"
                data-suffix="M"
              >
                0M
              </div>
              <div className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">
                Commits Scanned
              </div>
            </div>
            <div className="text-center reveal" style={{ transitionDelay: "0.3s" }}>
              <div
                className="text-4xl md:text-6xl font-bold mb-2 text-white tracking-tighter metric-pulse"
                data-count="98"
                data-suffix="%"
              >
                0%
              </div>
              <div className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">
                Accuracy Rate
              </div>
            </div>
            <div className="text-center reveal" style={{ transitionDelay: "0.4s" }}>
              <div
                className="text-4xl md:text-6xl font-bold mb-2 text-[#bbcb2e] tracking-tighter metric-pulse"
                data-count="4.2"
                data-suffix="x"
              >
                0.0x
              </div>
              <div className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">
                Shipping Speedup
              </div>
            </div>
          </div>
        </section> */}

        <section className="py-12 px-6">
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
                Paste / upload a diff / patch file. Get actionable insights in seconds.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="text-2xl font-bold tracking-tighter text-[#bbcb2e]">DiffLens</span>
            <span className="text-xs text-white/30 uppercase tracking-widest">
              Technical Excellence // 2026
            </span>
          </div>

          <div className="flex gap-6">
            {["Twitter", "GitHub", "Discord", "Status"].map((item) => (
              <a
                key={item}
                className="text-xs font-semibold text-white/40 hover:text-[#bbcb2e] transition-colors"
                href="#"
              >
                {item}
              </a>
            ))}
          </div>

          <div className="flex gap-6">
            {["Privacy", "Terms"].map((item) => (
              <a
                key={item}
                className="text-xs font-semibold text-white/40 hover:text-white transition-colors"
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
