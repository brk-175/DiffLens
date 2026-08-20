"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface NavbarProps {
  isAuthenticated?: boolean;
  onAuthClick?: () => void;
}

export default function Navbar({
  isAuthenticated = false,
  onAuthClick,
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  const onSignInPage = pathname === "/signin";
  const onUploadPage = pathname === "/upload";
  const handleAuthClick = onAuthClick ?? (() => router.push("/signin"));

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 transition-all duration-300 border-b border-transparent bg-transparent ${
        isScrolled ? "scrolled" : ""
      }`}>
      <div className="flex items-center gap-12">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-2xl font-bold tracking-tighter text-[#bbcb2e] cursor-pointer"
        >
          DiffLens
        </button>

        <div className="hidden md:flex gap-6">
          {/* <a href="#" className="text-sm font-medium hover:text-[#bbcb2e] transition-colors">
            Documentation
          </a> */}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {(isAuthenticated || !onSignInPage) && (
          <button
            type="button"
            onClick={handleAuthClick}
            className="text-sm font-medium hidden sm:block px-3 py-2 rounded-md transition-all duration-200 hover:bg-white/10 hover:text-[#C9D532] cursor-pointer"
          >
            {isAuthenticated ? "Sign Out" : "Sign In"}
          </button>
        )}

        <button
          type="button"
          onClick={() => router.push("/upload")}
          disabled={onUploadPage}
          className="px-4 py-2 bg-white text-black font-semibold text-sm rounded btn-glow-hover hover:bg-[#bbcb2e] transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        >
          Upload
        </button>
      </div>
    </nav>
  );
}
