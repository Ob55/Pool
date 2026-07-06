"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import AddResultModal from "@/components/AddResultModal";
import { supabase } from "@/lib/supabase";
import { PLAYER_COLORS } from "@/lib/players";
import { gameDate } from "@/lib/stats";

const PAGE_SIZE = 50;

function Details() {
  const [results, setResults] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    const from = (page - 1) * PAGE_SIZE;
    const { data, count } = await supabase
      .from("results")
      .select("*", { count: "exact" })
      .order("played_on", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    setResults(data ?? []);
    setTotal(count ?? 0);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  // Live refresh: any insert/update/delete on results reloads this page.
  useEffect(() => {
    const channel = supabase
      .channel("results-live-details")
      .on("postgres_changes", { event: "*", schema: "public", table: "results" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  async function remove(id) {
    if (!confirm("Delete this entry?")) return;
    await supabase.from("results").delete().eq("id", id);
    load();
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <header className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Game <span className="serif-accent text-4xl sm:text-5xl">Results</span>
          </h1>
          <p className="mt-1 text-sm text-emerald-100/50">
            Every session, on the record.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-glow rounded-full px-6 py-2.5 font-bold"
        >
          + Add Result
        </button>
      </header>

      <div className="glass rise rise-2 overflow-hidden rounded-3xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-white/10 text-emerald-200/60">
              <tr>
                <th className="px-5 py-4 font-semibold">Date</th>
                <th className="px-5 py-4 font-semibold">Player</th>
                <th className="px-5 py-4 text-center font-semibold">Wins</th>
                <th className="px-5 py-4 text-center font-semibold">Losses</th>
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {results === null ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center">
                    Loading… 🎱
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-emerald-200/70">
                    No results yet — click <b>+ Add Result</b> to record the first
                    session!
                  </td>
                </tr>
              ) : (
                results.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 transition hover:bg-white/5">
                    <td className="px-5 py-3.5 text-emerald-200/70">
                      {new Date(gameDate(r)).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5 font-semibold">
                      <span
                        className="mr-2.5 inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: PLAYER_COLORS[r.player], boxShadow: `0 0 10px ${PLAYER_COLORS[r.player]}` }}
                      />
                      {r.player}
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-emerald-300">
                      {r.wins}
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-red-300">
                      {r.losses}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => remove(r.id)}
                        className="rounded-lg px-2.5 py-1 text-xs text-red-300/70 transition hover:bg-red-500/20 hover:text-red-200"
                        title="Delete entry"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-sm">
            <span className="text-emerald-200/60">
              Page {page} of {pageCount} · {total} entries
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg px-3 py-1.5 font-semibold text-emerald-100 ring-1 ring-white/15 transition hover:bg-white/10 disabled:opacity-30"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page === pageCount}
                className="rounded-lg px-3 py-1.5 font-semibold text-emerald-100 ring-1 ring-white/15 transition hover:bg-white/10 disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <AddResultModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />
    </main>
  );
}

export default function DetailsPage() {
  return (
    <Shell>
      <Details />
    </Shell>
  );
}
