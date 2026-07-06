# 🎱 Pool Tracker

Settles the pool argument. Tracks wins/losses for Alvin, Brian, Niven, Sam — and Colo, the rare guest (N/A most days).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 and log in with **pool@gmail.com** / **Migos**.

## Pages

- **Dashboard** — leaderboard with titles (🥇 Tonkaaa, 🥈 Big Man, 🥉 Good Job, 😅 Nyanganya), points chart, win-ratio chart, and cumulative wins over time. Ranking is by points (1 win = 1 point), tiebreaker is win ratio.
- **Details** — all recorded results, with the **+ Add Result** popup: pick the game date, enter wins/losses for whoever played, and tick **N/A** for anyone unavailable that day (nothing is added or removed for them — Colo defaults to N/A). Entries can be deleted with ✕.
- **Ranking math** — points first (1 win = 1 point), then win ratio, then fewer losses, then more games played. Players with no recorded games show as 💤 N/A and don't take the Nyanganya title — that goes to the worst player who actually played.
- **Osso** — the floating 🎱 button (bottom-right) opens the chatbot; it answers questions about the scoreboard from live data: "who is winning?", "why is Brian in front of Alvin?", "compare Niven and Sam", "what is Sam's ratio?". Its brain lives in `src/lib/poolBot.js`.

## Live & interactive

- The dashboard **auto-updates in realtime** — add or delete a result on Details (from any device) and the standings, charts and titles recalculate instantly, no refresh needed (Supabase realtime, enabled by `scripts/migrate-realtime.mjs`).
- **Click any player card** on the dashboard to see their details: stats, a "Why this rank?" explanation comparing them to the players above/below, and their full game history.
- The Details table is **paginated at 50 entries per page** (Prev/Next), and everything works on mobile: the sidebar becomes a top bar and tables scroll sideways.

## Design

Liquid-glass dark UI (MotionSites style) on the green felt palette: left glass sidebar on desktop (top bar on mobile), Manrope + Instrument Serif italic accent type, glass cards, glow buttons, staggered entrance animations.

## Data

Stored in Supabase (project `poolDB`), table `results`. Row Level Security only allows the logged-in account to read/write.

`scripts/setup.mjs` (`npm run setup`) is the one-time setup that created the login user and the table — you shouldn't need it again. Secrets live in `.env.local` (git-ignored).
