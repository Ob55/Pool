export const PLAYERS = [
  { name: "Alvin", color: "#ef4444" },
  { name: "Brian", color: "#3b82f6" },
  { name: "Niven", color: "#22c55e" },
  { name: "Sam", color: "#f59e0b" },
  // Colo rarely makes it to the table — defaults to N/A when adding results.
  { name: "Colo", color: "#a855f7", rarelyAvailable: true },
];

export const PLAYER_COLORS = Object.fromEntries(
  PLAYERS.map((p) => [p.name, p.color])
);

// Titles by position: podium at the top, Nyanganya always last.
export function rankTitleFor(index, count) {
  if (index === 0) return { title: "Tonkaaa", emoji: "🥇" };
  if (index === count - 1) return { title: "Nyanganya", emoji: "😅" };
  if (index === 1) return { title: "Big Man", emoji: "🥈" };
  if (index === 2) return { title: "Good Job", emoji: "🥉" };
  return { title: "In the Mix", emoji: "🎯" };
}

// Attach a rank title to each (already sorted) totals entry.
// Titles are competed for only by players with recorded games —
// someone who hasn't played (like Colo most days) is N/A, and the
// "Nyanganya" title goes to the worst player who actually played.
export function assignTitles(totals) {
  const activeCount = totals.filter((p) => p.games > 0).length;
  let activeIndex = 0;
  return totals.map((p) =>
    p.games === 0
      ? { ...p, rankTitle: { title: "N/A", emoji: "💤" } }
      : { ...p, rankTitle: rankTitleFor(activeIndex++, activeCount) }
  );
}
