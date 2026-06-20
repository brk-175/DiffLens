"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AuthStep = "email" | "create_password" | "enter_password";

type CheckEmailResponse = {
  email: string;
  exists: boolean;
  next_step: "create_password" | "enter_password";
};

type SignInResponse = {
  access_token: string;
  token_type: string;
  is_new_user?: boolean;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInPage() {
  const router = useRouter();
  const apiBase = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/$/, ""),
    []
  );

  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const layer = document.getElementById("mouse-gradient-layer");
    if (!layer) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    let rafId = 0;
    const handleMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        layer.style.setProperty("--mouse-x", `${clientX}px`);
        layer.style.setProperty("--mouse-y", `${clientY}px`);
      });
    };

    document.addEventListener("mousemove", handleMove);
    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", handleMove);
    };
  }, []);

  const isValidEmail = (value: string) => EMAIL_REGEX.test(value.trim());

  const headerText = step === "email" ? "DiffLens" : step === "create_password" ? "Join DiffLens" : "Welcome Back";
  const showDescription = step === "email";

  const buttonText =
    step === "email" ? "Continue" : step === "create_password" ? "Create Account" : "Sign In";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (step === "email") {
      if (!isValidEmail(normalizedEmail)) {
        setError("Please enter a valid email address.");
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`${apiBase}/auth/password/check-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail }),
        });

        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || "Unable to continue. Please try again.");
        }

        const data: CheckEmailResponse = await res.json();

        if (data.next_step === "create_password") {
          setStep("create_password");
        } else {
          setStep("enter_password");
        }

        setEmail(normalizedEmail);
        return;
      } catch {
        setError("Could not verify email right now. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/auth/password/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid email or password.");
        const t = await res.text();
        throw new Error(t || "Authentication failed.");
      }

      const data: SignInResponse = await res.json();

      localStorage.setItem("difflens_access_token", data.access_token);

      router.replace("/upload");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignIn() {
    window.location.href = `${apiBase}/auth/google/login`;
  }

  function onEmailChange(next: string) {
    setEmail(next);
    if (step !== "email") {
      setStep("email");
      setPassword("");
      setError("");
    }
  }

  return (
    <div className="signin-page bg-[#000000] text-[#ffffff] min-h-screen flex flex-col overflow-hidden relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0 tech-grid" />
      <div
        id="mouse-gradient-layer"
        className="fixed inset-0 pointer-events-none z-0 mouse-gradient transition-opacity duration-300"
      />

      <main className="relative z-10 flex-grow flex items-center justify-center px-4 md:px-8">
        <div className="w-full max-w-[420px] flex flex-col gap-12">
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 bg-[#bbcb2e] flex items-center justify-center rounded-lg mb-4 animate-fade-in-up cursor-pointer">
              <a onClick={() => router.push("/")}>
                <span
                  className="material-symbols-outlined text-[#000000] text-[28px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  insights
                </span>
              </a>
            </div>

            <h1 className="text-[48px] leading-[56px] tracking-[-0.02em] font-bold text-[#ffffff] animate-fade-in-up delay-100">
              {headerText}
            </h1>

            {showDescription && (
              <p className="text-[16px] leading-[28px] text-[#a1a1a1] max-w-[280px] animate-fade-in-up delay-100">
                Engineering excellence through precision code visualization.
              </p>
            )}
          </div>

          {/* Card */}
          <div className="glass-card p-8 flex flex-col gap-6 rounded-xl animate-fade-in-up delay-200">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full h-14 bg-transparent border border-[#dddddd] hover:bg-[#dddddd]/10 hover:border-[#ffffff] hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] transition-all duration-300 ease-out flex items-center justify-center gap-4 rounded-lg group cursor-pointer"
            >
              <svg className="w-5 h-5 fill-[#ffffff] group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-[16px] leading-[24px] font-semibold text-[#ffffff]">Continue with Google</span>
            </button>

            <div className="flex items-center gap-4">
              <div className="h-[1px] flex-grow bg-[#dddddd]/30" />
              <span className="text-[12px] leading-[16px] tracking-[0.05em] uppercase text-[#dddddd] font-[500]">
                or
              </span>
              <div className="h-[1px] flex-grow bg-[#dddddd]/30" />
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1 group">
                <label className="text-[12px] leading-[16px] tracking-[0.05em] text-[#dddddd] ml-1">
                  Email Address
                </label>
                <div className="focus-pulse border border-[#dddddd] bg-[#000000] h-12 flex items-center px-4 transition-all rounded-lg">
                  <span className="material-symbols-outlined text-[#dddddd] mr-4 text-[20px]">mail</span>
                  <input
                    className="bg-transparent border-none outline-none text-[#ffffff] text-[14px] leading-[20px] w-full placeholder:text-[#dddddd]/50 font-mono autofill-fix"
                    placeholder="dev@difflens.io"
                    type="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    readOnly={step !== "email"}
                  />
                </div>
              </div>

              <div
                className={`flex flex-col gap-4 overflow-hidden transition-all duration-500 ${
                  step === "email" ? "max-h-0 opacity-0" : "max-h-[300px] opacity-100"
                }`}
              >
                <div className="flex flex-col gap-1 group">
                  <label className="text-[12px] leading-[16px] tracking-[0.05em] text-[#dddddd] ml-1">
                    {step === "create_password" ? "Create Password" : "Password"}
                  </label>
                  <div className="focus-pulse border border-[#dddddd] bg-[#000000] h-12 flex items-center px-4 transition-all rounded-lg">
                    <span className="material-symbols-outlined text-[#dddddd] mr-4 text-[20px]">
                      {step === "create_password" ? "lock" : "vpn_key"}
                    </span>
                    <input
                      className="bg-transparent border-none outline-none text-[#ffffff] text-[14px] leading-[20px] w-full placeholder:text-[#dddddd]/50 font-mono autofill-fix"
                      placeholder="••••••••••••"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {error && <p className="text-[#ffb4ab] text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-[#bbcb2e] hover:bg-[#c0d033] text-[#000000] text-[16px] leading-[24px] font-semibold transition-all duration-300 mt-4 rounded-lg btn-glow disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? "Please wait..." : buttonText}
              </button>
            </form>
          </div>

          {/* Footer links */}
          <div className="flex flex-col items-center gap-4 animate-fade-in-up delay-300">
            <div className="flex gap-6 opacity-60 hover:opacity-100 transition-opacity duration-300">
              <a className="text-[12px] leading-[16px] tracking-[0.05em] text-[#dddddd] hover:text-[#ffffff]" href="#">
                Docs
              </a>
              <a className="text-[12px] leading-[16px] tracking-[0.05em] text-[#dddddd] hover:text-[#ffffff]" href="#">
                Security
              </a>
              <a className="text-[12px] leading-[16px] tracking-[0.05em] text-[#dddddd] hover:text-[#ffffff]" href="#">
                Status
              </a>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        .signin-page {
          font-family: var(--font-noto-sans), "Noto Sans", sans-serif;
        }

        .glass-card {
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid #dddddd;
        }

        .tech-grid {
          background-size: 40px 40px;
          background-image: linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          animation: pulseOpacity 8s infinite ease-in-out;
        }

        .mouse-gradient {
          background: radial-gradient(
            600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
            rgba(187, 203, 46, 0.05),
            transparent 40%
          );
        }

        .focus-pulse:focus-within {
          animation: breathingGlow 2s infinite;
          border-color: #bbcb2e;
        }

        .btn-glow {
          animation: breathingGlow 3s infinite ease-in-out;
        }

        .animate-fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .delay-100 {
          animation-delay: 100ms;
        }
        .delay-200 {
          animation-delay: 200ms;
        }
        .delay-300 {
          animation-delay: 300ms;
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

        @keyframes breathingGlow {
          0% {
            box-shadow: 0 0 5px rgba(154, 191, 128, 0.2);
          }
          50% {
            box-shadow: 0 0 20px rgba(154, 191, 128, 0.6);
          }
          100% {
            box-shadow: 0 0 5px rgba(154, 191, 128, 0.2);
          }
        }

        @keyframes pulseOpacity {
          0%,
          100% {
            opacity: 0.03;
          }
          50% {
            opacity: 0.08;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fade-in-up,
          .btn-glow,
          .tech-grid,
          .focus-pulse:focus-within {
            animation: none;
            opacity: 1;
            transform: none;
          }
          .mouse-gradient {
            background: none;
          }
        }
      `}</style>
    </div>
  );
}
