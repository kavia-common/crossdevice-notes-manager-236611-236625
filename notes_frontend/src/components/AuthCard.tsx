"use client";

import { useMemo, useState } from "react";

type Mode = "login" | "register";

export type AuthCardProps = {
  mode: Mode;
  onSubmit: (email: string, password: string) => Promise<void>;
  onSwitchMode: () => void;
};

function validateEmail(email: string): string | null {
  const v = email.trim();
  if (!v) return "Email is required.";
  if (!/^\S+@\S+\.\S+$/.test(v)) return "Please enter a valid email.";
  return null;
}

function validatePassword(pw: string): string | null {
  if (!pw) return "Password is required.";
  if (pw.length < 6) return "Password must be at least 6 characters.";
  return null;
}

// PUBLIC_INTERFACE
export function AuthCard(props: AuthCardProps) {
  /** Login/register form with retro styling and basic validation. */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = useMemo(() => validateEmail(email), [email]);
  const pwError = useMemo(() => validatePassword(password), [password]);
  const disabled = busy || !!emailError || !!pwError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    if (eErr || pErr) {
      setError(eErr || pErr);
      return;
    }

    setBusy(true);
    try {
      await props.onSubmit(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="retro-card w-full max-w-md p-5 md:p-6">
      <header className="mb-4">
        <h1 className="text-xl font-black tracking-tight">
          {props.mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {props.mode === "login"
            ? "Sign in to sync your notes across devices."
            : "Register to start writing notes (local mode ready; cloud sync coming)."}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-bold">
            Email
          </label>
          <input
            id="email"
            className="retro-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />
          {emailError ? (
            <p className="text-xs text-[color:var(--danger)]">{emailError}</p>
          ) : null}
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-bold">
            Password
          </label>
          <input
            id="password"
            className="retro-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              props.mode === "login" ? "current-password" : "new-password"
            }
            placeholder="••••••"
          />
          {pwError ? (
            <p className="text-xs text-[color:var(--danger)]">{pwError}</p>
          ) : null}
        </div>

        {error ? (
          <div
            className="retro-card-sm p-3 text-sm"
            role="alert"
            aria-live="assertive"
          >
            <p className="font-bold text-[color:var(--danger)]">{error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          className="retro-button retro-button-primary w-full"
          disabled={disabled}
        >
          {busy
            ? "Working…"
            : props.mode === "login"
              ? "Login"
              : "Register"}
        </button>
      </form>

      <footer className="mt-4 text-sm">
        <button type="button" className="retro-link" onClick={props.onSwitchMode}>
          {props.mode === "login"
            ? "Need an account? Register"
            : "Already have an account? Login"}
        </button>
      </footer>
    </section>
  );
}
