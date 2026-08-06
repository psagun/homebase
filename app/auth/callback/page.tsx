"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      if (!supabase) {
        setError("Supabase is not configured for this deployment.");
        return;
      }
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session) {
          throw new Error("No session");
        }
        const res = await fetch("/api/v1/auth/google", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: data.session.access_token }),
        });
        if (!res.ok) {
          throw new Error("Sign-in failed");
        }
        router.replace("/dashboard");
      } catch {
        setError("Google sign-in failed. Please try again.");
      }
    })();
  }, [router]);

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-8 shadow-lg">
        <h2 className="text-xl font-semibold">Sign-in failed</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Link href="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-8 shadow-lg">
      <h2 className="text-xl font-semibold">Completing Google sign-in…</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Verifying your session, one moment.
      </p>
    </div>
  );
}
