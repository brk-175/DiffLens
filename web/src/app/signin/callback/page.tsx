"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAccessToken } from "@/lib/auth/session";


function SignInCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();

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

        // Clean URL + move user forward
        router.replace("/upload");
      } catch {
        setMessage("Sign-in processing failed.");
      }
    };

    void run();
  }, [params, router]);

  return (
    <main className="min-h-screen bg-black text-white pt-24 px-6 flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg">{message}</p>
      </div>
    </main>
  );
}

export default function SignInCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black text-white pt-24 px-6 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg">Completing sign in...</p>
          </div>
        </main>
      }
    >
      <SignInCallbackContent />
    </Suspense>
  );
}
