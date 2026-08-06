"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { verifyEmail, resendCode } from "@/lib/api/auth";

export default function VerifyPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") || "");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Missing email — go back to sign in and try again.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await verifyEmail(email, code.trim());
      router.replace("/dashboard");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Verification failed";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setError(null);
    try {
      await resendCode(email);
      setInfo("A new code was sent — check your inbox.");
    } catch {
      setError("Could not resend the code. Try again shortly.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-8 shadow-lg">
      <h2 className="text-xl font-semibold">Verify your email</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        We sent a 6-digit code to <span className="font-medium text-foreground">{email || "your inbox"}</span>.
        Enter it below to activate your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {info && (
          <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{info}</div>
        )}

        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Verification code
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm tracking-[0.5em] text-center shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="••••••"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || code.length !== 6}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isLoading ? "Verifying…" : "Verify & sign in"}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-primary hover:underline disabled:opacity-50"
        >
          {resending ? "Sending…" : "Resend code"}
        </button>
        <Link href="/login" className="text-muted-foreground hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
