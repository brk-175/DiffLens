"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { linkGuestReviews, setAccessToken } from "@/lib/auth/session";


export default function SignInCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const apiBase = useMemo(
    () => (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/$/, ""),
    []
  );

  const [message, setMessage] = useState("Completing sign in...");

  useEffect(() => {
    const run = async () => {
      const accessToken = params.get("access_token");

      if (!accessToken) {
        setMessage("Authentication failed: token missing.");
        return;
      }

      try {
        setAccessToken(accessToken);

        try {
          await linkGuestReviews(apiBase, accessToken);
        } catch (linkErr) {
          console.error("Guest linking failed after Google sign-in: ", linkErr);
        }

        // Clean URL + move user forward
        router.replace("/upload");
      } catch {
        setMessage("Sign-in processing failed.");
      }
    };

    void run();
  }, [apiBase, params, router]);

  return (
    <main className="min-h-screen bg-black text-white pt-24 px-6 flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg">{message}</p>
      </div>
    </main>
  );
}
