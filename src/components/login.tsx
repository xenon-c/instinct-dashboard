"use client";

import { ArrowRight, ArrowUpRight, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import { Brand } from "./ui";

export function Login({ onBack }: { onBack: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const { error } = await getSupabase().auth.signInWithPassword({
        email: String(form.get("email")).trim(),
        password: String(form.get("password")),
      });
      if (error) setError(error.message);
    } catch {
      setError("Could not reach the sign-in service. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <header className="topbar">
        <Brand />
      </header>
      <main className="login-main">
        <div className="login-intro">
          <h1>
            Your world.
            <br />
            <span>In one place.</span>
          </h1>
        </div>
        <section className="login-card">
          <span className="login-lock">
            <LockKeyhole size={22} />
          </span>
          <h2>Welcome back</h2>
          <p>Sign in to your private dashboard.</p>
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary-button" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
              <ArrowRight size={16} />
            </button>
          </form>
          <button className="preview-button" onClick={onBack}>
            Back to sample data
            <ArrowUpRight size={14} />
          </button>
        </section>
      </main>
    </div>
  );
}
