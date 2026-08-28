"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAccessToken, getAccessToken } from "@/lib/auth/session";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const onUploadPage = pathname === "/upload";
  const onSignInPage = pathname === "/signin";

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const syncAuthState = () => setIsAuthenticated(Boolean(getAccessToken()));
    syncAuthState();
    window.addEventListener("storage", syncAuthState);
    return () => window.removeEventListener("storage", syncAuthState);
  }, [pathname]);

  const onAuthClick = () => {
    if (isAuthenticated) {
      clearAccessToken();
      setIsAuthenticated(false);
      router.push("/");
      return;
    }
    router.push("/signin");
  };

  return (
    <nav
      id="navbar"
      className={`fixed top-0 w-full z-50 h-20 flex items-center justify-between px-6 md:px-12 transition-all duration-500 border-b border-transparent bg-transparent ${
        isScrolled ? "scrolled" : ""
      }`}
    >
      <div className="flex items-center gap-12">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-2xl font-bold tracking-tighter text-[#bbcb2e] cursor-pointer"
        >
          DiffLens
        </button>

        <div className="hidden md:flex gap-6">
          {/* Documentation tab is commented out for potential future use
          <a className="text-sm font-medium hover:text-[#bbcb2e] transition-colors" href="#">
            Documentation
          </a>
          */}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {(isAuthenticated || !onSignInPage) && (
          <button
            type="button"
            onClick={onAuthClick}
            className="text-sm font-medium hidden sm:block px-3 py-2 rounded-md transition-all duration-200 hover:bg-white/10 hover:text-[#C9D532] cursor-pointer"
          >
            {isAuthenticated ? "Sign Out" : "Sign In"}
          </button>
        )}

        <button
          type="button"
          onClick={() => router.push("/upload")}
          disabled={onUploadPage}
          className="px-4 py-2 bg-white text-black font-semibold text-sm rounded btn-glow-hover hover:bg-[#bbcb2e] transition-all active:scale-95 cursor-pointer disabled:opacity-80 disabled:cursor-default disabled:bg-gray-500"
        >
          {onUploadPage ? "Reviewer" : "Start Reviewing"}
        </button>
      </div>
    </nav>
  );
}
