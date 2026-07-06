"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("pool@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Wrong email or password. Try again!");
      setBusy(false);
    } else {
      router.replace("/");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="glass rise w-full max-w-sm rounded-3xl p-8"
      >
        <div className="mb-8 text-center">
          <div className="text-5xl">🎱</div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
            Pool <span className="serif-accent text-4xl">Tracker</span>
          </h1>
          <p className="mt-2 text-sm text-emerald-200/60">
            Settle the argument once and for all
          </p>
        </div>

        <label className="mb-1.5 block text-sm font-semibold text-emerald-100/80">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-4 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 outline-none transition focus:border-emerald-400/60"
        />

        <label className="mb-1.5 block text-sm font-semibold text-emerald-100/80">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-4 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 outline-none transition focus:border-emerald-400/60"
        />

        {error && <p className="mb-4 text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="btn-glow w-full rounded-xl py-3 font-bold disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
