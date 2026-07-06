"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, CartesianGrid, Cell,
} from "recharts";
import Shell from "@/components/Shell";
import Leaderboard from "@/components/Leaderboard";
import PlayerModal from "@/components/PlayerModal";
import { supabase } from "@/lib/supabase";
import { PLAYERS, assignTitles } from "@/lib/players";
import { computeTotals, computeTimeline } from "@/lib/stats";

const tooltipStyle = {
  background: "#04120c",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: "12px",
  color: "#f0fdf4",
};

function Card({ title, children, className = "" }) {
  return (
    <div className={`glass rounded-3xl p-6 ${className}`}>
      <h3 className="mb-5 font-bold tracking-tight text-emerald-50">{title}</h3>
      {children}
    </div>
  );
}

function Dashboard() {
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("results")
      .select("*")
      .order("created_at", { ascending: true });
    setResults(data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live refresh: standings recalculate the moment a result is added,
  // edited or deleted on the Details page — even from another device.
  useEffect(() => {
    const channel = supabase
      .channel("results-live-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "results" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  if (results === null) {
    return <div className="p-10 text-center">Loading stats… 🎱</div>;
  }

  const totals = assignTitles(computeTotals(results));
  const timeline = computeTimeline(results);
  const ratioData = totals.map((p) => ({ ...p, pct: Math.round(p.ratio * 100) }));
  const selectedPlayer = selected
    ? totals.find((p) => p.name === selected)
    : null;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      <header className="rise">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Overall <span className="serif-accent text-4xl sm:text-5xl">Standings</span>
        </h1>
        <p className="mt-1 text-sm text-emerald-100/50">
          Every win counts. The table doesn&apos;t lie. 🎱
        </p>
      </header>

      <Leaderboard totals={totals} onSelect={(p) => setSelected(p.name)} />

      {results.length === 0 ? (
        <Card title="No games yet" className="rise rise-3">
          <p className="text-emerald-200/70">
            Head to the <b>Details</b> page and hit <b>+ Add Result</b> to record
            your first session. 🎱
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Points (total wins) per player" className="rise rise-3">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={totals}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="#a7f3d0" />
                <YAxis allowDecimals={false} stroke="#a7f3d0" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                <Bar dataKey="wins" name="Points" radius={[8, 8, 0, 0]}>
                  {totals.map((p) => (
                    <Cell key={p.name} fill={p.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Win ratio (%)" className="rise rise-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ratioData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="#a7f3d0" />
                <YAxis domain={[0, 100]} stroke="#a7f3d0" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                <Bar dataKey="pct" name="Win ratio %" radius={[8, 8, 0, 0]}>
                  {ratioData.map((p) => (
                    <Cell key={p.name} fill={p.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="The rivalry over time (cumulative wins)" className="rise rise-5 lg:col-span-2">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="day" stroke="#a7f3d0" />
                <YAxis allowDecimals={false} stroke="#a7f3d0" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                {PLAYERS.map((p) => (
                  <Line
                    key={p.name}
                    type="monotone"
                    dataKey={p.name}
                    stroke={p.color}
                    strokeWidth={2.5}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          totals={totals}
          results={results}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Shell>
      <Dashboard />
    </Shell>
  );
}
