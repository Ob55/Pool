"use client";

import { gameDate } from "@/lib/stats";
import { explainOrder } from "@/lib/poolBot";

export default function PlayerModal({ player, totals, results, onClose }) {
  if (!player) return null;

  const rank = totals.findIndex((p) => p.name === player.name);
  const above = rank > 0 ? totals[rank - 1] : null;
  const below = rank < totals.length - 1 ? totals[rank + 1] : null;
  const history = results
    .filter((r) => r.player === player.name)
    .sort(
      (a, b) =>
        gameDate(b).localeCompare(gameDate(a)) ||
        new Date(b.created_at) - new Date(a.created_at)
    );

  const whyLines = [];
  if (player.games === 0) {
    whyLines.push(
      `${player.name} has no games on record yet${player.rarelyAvailable ? " — N/A most days" : ""}, so there's no ranking to explain.`
    );
  } else {
    if (rank === 0 && below) {
      const line = explainOrder(player, below);
      if (line) whyLines.push(`Holding #1: ${line}`);
    }
    if (above && above.games > 0) {
      const line = explainOrder(above, player);
      if (line) whyLines.push(`Chasing #${rank}: ${line}`);
    }
    if (rank !== 0 && below && below.games > 0) {
      const line = explainOrder(player, below);
      if (line) whyLines.push(`Staying ahead: ${line}`);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass rise max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-[#07231a]/90 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ background: player.color, boxShadow: `0 0 12px ${player.color}` }}
              />
              <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: player.color }}>
                {player.name}
              </h2>
              {player.rarelyAvailable && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-100/60 ring-1 ring-white/15">
                  N/A most days
                </span>
              )}
            </div>
            <div className="mt-1 text-sm text-emerald-200/70">
              Ranked #{rank + 1} · {player.rankTitle.emoji}{" "}
              <span className="serif-accent text-base">“{player.rankTitle.title}”</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2.5 py-1 text-emerald-100/60 transition hover:bg-white/10 hover:text-emerald-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3 text-center">
          {[
            ["Points", player.wins],
            ["Losses", player.losses],
            ["Games", player.games],
            ["Ratio", player.games > 0 ? `${Math.round(player.ratio * 100)}%` : "—"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white/5 py-3 ring-1 ring-white/10">
              <div className="text-xl font-extrabold tracking-tight">{value}</div>
              <div className="text-xs text-emerald-200/50">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <h3 className="mb-2 text-sm font-bold text-emerald-100">
            Why this rank? 🎯
          </h3>
          <ul className="space-y-2 text-sm leading-relaxed text-emerald-100/80">
            {whyLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>

        <div className="mt-5">
          <h3 className="mb-2 text-sm font-bold text-emerald-100">
            Game history ({history.length} entries)
          </h3>
          {history.length === 0 ? (
            <p className="text-sm text-emerald-200/60">Nothing recorded yet.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-2xl ring-1 ring-white/10">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[#0a2b20] text-emerald-200/60">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Wins</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Losses</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r) => (
                    <tr key={r.id} className="border-t border-white/5">
                      <td className="px-4 py-2.5 text-emerald-200/70">
                        {new Date(gameDate(r)).toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold text-emerald-300">{r.wins}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-red-300">{r.losses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
