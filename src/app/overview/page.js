"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { supabase } from "@/lib/supabase";
import { computeOverviewByDate, gameDate } from "@/lib/stats";

function OverviewPageContent() {
  const [results, setResults] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("results").select("*").order("created_at", { ascending: true });
    setResults(data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("results-live-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "results" }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [load]);

  if (results === null) {
    return <div className="p-10 text-center">Loading overview… 🎱</div>;
  }

  const overview = computeOverviewByDate(results);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <header className="rise">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Overview <span className="serif-accent text-4xl sm:text-5xl">Results</span>
        </h1>
        <p className="mt-1 text-sm text-emerald-100/50">
          See the top and bottom player for each recorded date.
        </p>
      </header>

      {results.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-emerald-200/70">
          No results yet — add a game session first and the overview will appear here.
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-white/10 text-emerald-200/60">
                <tr>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Top</th>
                  <th className="px-5 py-4 font-semibold">Bottom</th>
                </tr>
              </thead>
              <tbody>
                {overview.map((item) => (
                  <tr key={item.day} className="border-b border-white/5 transition hover:bg-white/5">
                    <td className="px-5 py-3.5 text-emerald-200/70">
                      {new Date(gameDate({ played_on: item.day })).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-emerald-300">
                      {item.first.name} — {item.first.wins} wins
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-red-300">
                      {item.last.name} — {item.last.wins} wins
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

export default function OverviewPage() {
  return (
    <Shell>
      <OverviewPageContent />
    </Shell>
  );
}
