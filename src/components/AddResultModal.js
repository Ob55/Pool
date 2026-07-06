"use client";

import { useState } from "react";
import { PLAYERS } from "@/lib/players";
import { supabase } from "@/lib/supabase";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Colo starts as N/A — he's unavailable most days.
const emptyForm = () =>
  Object.fromEntries(
    PLAYERS.map((p) => [
      p.name,
      { wins: "", losses: "", na: !!p.rarelyAvailable },
    ])
  );

export default function AddResultModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  function update(name, field, value) {
    setForm((f) => ({ ...f, [name]: { ...f[name], [field]: value } }));
  }

  function toggleNa(name) {
    setForm((f) => ({
      ...f,
      [name]: f[name].na
        ? { ...f[name], na: false }
        : { wins: "", losses: "", na: true },
    }));
  }

  async function save() {
    if (!date) {
      setError("Pick the date the games were played.");
      return;
    }
    // N/A players sat out — nothing is added or removed for them.
    const rows = PLAYERS.filter((p) => !form[p.name].na)
      .map((p) => ({
        player: p.name,
        wins: parseInt(form[p.name].wins, 10) || 0,
        losses: parseInt(form[p.name].losses, 10) || 0,
        played_on: date,
      }))
      .filter((r) => r.wins > 0 || r.losses > 0);

    if (rows.length === 0) {
      setError("Enter at least one win or loss for a player who played.");
      return;
    }
    setBusy(true);
    setError("");
    const { error } = await supabase.from("results").insert(rows);
    setBusy(false);
    if (error) {
      setError(error.message);
    } else {
      setForm(emptyForm());
      setDate(today());
      onSaved();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="glass rise max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-[#07231a]/90 p-6">
        <h2 className="mb-1 text-2xl font-extrabold tracking-tight">
          Add <span className="serif-accent text-2xl">Result</span> 🎱
        </h2>
        <p className="mb-4 text-sm text-emerald-200/70">
          Enter wins and losses for whoever played. Tick N/A for anyone who
          wasn&apos;t around — nothing is recorded for them.
        </p>

        <label className="mb-1.5 block text-sm font-semibold text-emerald-100/80">
          Game date
        </label>
        <input
          type="date"
          value={date}
          max={today()}
          onChange={(e) => setDate(e.target.value)}
          className="mb-5 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-sm outline-none [color-scheme:dark] focus:border-emerald-400/60"
        />

        <div className="space-y-3">
          {PLAYERS.map((p) => {
            const na = form[p.name].na;
            return (
              <div key={p.name} className="flex items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: p.color }}
                />
                <span className="w-14 shrink-0 font-medium">
                  {p.name}
                  {p.rarelyAvailable && (
                    <span className="block text-[9px] uppercase tracking-wide text-emerald-100/40">
                      rare guest
                    </span>
                  )}
                </span>
                <input
                  type="number"
                  min="0"
                  placeholder="Wins"
                  disabled={na}
                  value={form[p.name].wins}
                  onChange={(e) => update(p.name, "wins", e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm outline-none focus:border-emerald-400 disabled:opacity-30"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Losses"
                  disabled={na}
                  value={form[p.name].losses}
                  onChange={(e) => update(p.name, "losses", e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm outline-none focus:border-emerald-400 disabled:opacity-30"
                />
                <label
                  className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold ring-1 transition ${
                    na
                      ? "bg-white/10 text-emerald-100 ring-white/25"
                      : "text-emerald-100/40 ring-white/10 hover:text-emerald-100/70"
                  }`}
                  title="Unavailable that day — nothing is added or removed"
                >
                  <input
                    type="checkbox"
                    checked={na}
                    onChange={() => toggleNa(p.name)}
                    className="accent-emerald-400"
                  />
                  N/A
                </label>
              </div>
            );
          })}
        </div>

        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-emerald-100 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="btn-glow rounded-xl px-6 py-2 text-sm font-bold disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
