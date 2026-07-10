import { PLAYERS } from "./players";// The day a result belongs to: the chosen game date, falling back to entry time.
export function gameDate(r) {
  return r.played_on ?? (r.created_at ?? "").slice(0, 10);
}// Per-player totals: points (= total wins), losses, games, win ratio.
export function computeTotals(results) {
  const totals = PLAYERS.map((p) => {
    const rows = results.filter((r) => r.player === p.name);
    const wins = rows.reduce((s, r) => s + r.wins, 0);
    const losses = rows.reduce((s, r) => s + r.losses, 0);
    const games = wins + losses;
    return {
      ...p,
      wins,
      losses,
      games,
      ratio: games > 0 ? wins / games : 0,
    };
  });
  // Professional ranking: points first, then win ratio, then fewer losses,
  // then more games played (rewards showing up), then name for stability.
  return totals.sort(
    (a, b) =>
      b.wins - a.wins ||
      b.ratio - a.ratio ||
      a.losses - b.losses ||
      b.games - a.games ||
      a.name.localeCompare(b.name)
  );
}// A simple overview of the top and bottom performer for each date in the results.
export function computeOverviewByDate(results) {
  const grouped = new Map();  for (const row of results) {
    const day = gameDate(row);
    if (!grouped.has(day)) {
      grouped.set(day, []);
    }
    grouped.get(day).push(row);
  }  return [...grouped.entries()]
    .map(([day, rows]) => {
      const totals = computeTotals(rows).filter((p) => p.games > 0);
      if (totals.length === 0) return null;
      return {
        day,
        first: totals[0],
        last: totals[totals.length - 1],
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.day.localeCompare(b.day));
}// Cumulative wins over time, one series point per game day.
export function computeTimeline(results) {
  const sorted = [...results].sort(
    (a, b) => gameDate(a).localeCompare(gameDate(b)) ||
      new Date(a.created_at) - new Date(b.created_at)
  );
  const running = Object.fromEntries(PLAYERS.map((p) => [p.name, 0]));
  const byDay = new Map();
  for (const r of sorted) {
    running[r.player] += r.wins;
    const day = new Date(gameDate(r)).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
    byDay.set(day, { day, ...running });
  }
  return [...byDay.values()];
}
