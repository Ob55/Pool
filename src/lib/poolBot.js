// The Pool Bot brain: answers questions about standings using live results.
import { PLAYERS, rankTitleFor, assignTitles } from "./players";
import { computeTotals, gameDate } from "./stats";

const pct = (r) => `${Math.round(r * 100)}%`;

const plural = (n, word, pluralWord = `${word}s`) =>
  `${n} ${n === 1 ? word : pluralWord}`;

// Straight substitutions for common shorthand and mangled spellings that
// Levenshtein alone wouldn't reliably land on.
const TYPO_MAP = {
  appolog: "apology",
  appoligy: "apology",
  appolify: "apology",
  apolog: "apology",
  apoligies: "apologies",
  penality: "penalty",
  penelty: "penalty",
  penalti: "penalty",
  penatly: "penalty",
  standng: "standing",
  standin: "standing",
  rankng: "ranking",
  ratrio: "ratio",
  winratio: "ratio",
  winnng: "winning",
  winn: "win",
  losss: "loss",
  losng: "loss",
  whos: "who is",
  whats: "what is",
  hos: "who is",
  wo: "who",
  wining: "winning",
  loosing: "losing",
  loose: "lose",
  looses: "loses",
  doesnt: "does not",
  dont: "do not",
  cant: "can not",
  pls: "please",
  u: "you",
  ur: "your",
  vs: "versus",
  wat: "what",
  wut: "what",
  hw: "how",
  y: "why",
};

// Domain vocabulary the fuzzy corrector snaps mistyped words back to.
// Player names live here too, so "Brain"/"Nivin"/"Alvn" resolve correctly.
const VOCAB = [
  // player names
  "alvin", "brian", "niven", "sam", "colo",
  // question words + intents
  "who", "how", "why", "what", "which", "where", "when", "does", "is", "are",
  "winning", "win", "wins", "winner", "won", "champion", "leading", "leader",
  "loss", "losses", "lose", "loses", "lost", "losing",
  "ratio", "percent", "percentage", "average",
  "point", "points", "score", "scores", "record", "records",
  "rank", "ranking", "ranked", "rankings", "position", "place",
  "standing", "standings", "leaderboard", "table", "board", "order",
  "most", "least", "fewest", "highest", "lowest", "biggest", "smallest",
  "best", "worst", "sharpest", "top", "bottom", "better", "than",
  "first", "second", "third", "last", "podium", "overall", "number",
  "penalty", "penalties", "apology", "apologies", "sorry", "fine", "miss",
  "missed", "missing", "absent", "skip", "skipped",
  "form", "streak", "momentum", "trend", "hot", "cold",
  "game", "games", "match", "matches", "session", "sessions", "played", "play",
  "compare", "comparison", "against", "versus", "beat", "beating", "beats",
  "ahead", "behind", "front", "above", "below",
  "everyone", "player", "players", "stats", "summary", "everybody",
  "recent", "latest", "today", "yesterday", "date", "happened", "results",
  "result", "available", "around", "tell", "about", "info", "details",
];
const VOCAB_SET = new Set(VOCAB);

// Common English words we must never "correct" — they're valid as-is and
// happen to sit one edit away from a domain word (e.g. "show" → "how").
const PROTECTED = new Set([
  "show", "have", "has", "had", "many", "much", "does", "did", "done",
  "get", "got", "are", "was", "were", "will", "would", "should", "could",
  "come", "came", "make", "made", "some", "same", "they", "them", "then",
  "this", "that", "there", "here", "been", "being", "into", "over", "only",
  "also", "when", "your", "you", "our", "his", "her", "him", "she", "with",
  "from", "just", "like", "want", "know", "need", "give", "each", "any",
  "all", "not", "but", "and", "for", "the", "out", "now", "day", "days",
  "week", "still", "back", "good", "great", "nice", "cool", "please",
]);

// Damerau optimal-string-alignment distance: like Levenshtein but adjacent
// transpositions cost 1, so "brain"→"brian" and "wininng"→"winning" resolve.
function editDistance(a, b, cap) {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > cap) return cap + 1;
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
      if (d[i][j] < rowMin) rowMin = d[i][j];
    }
    if (rowMin > cap) return cap + 1;
  }
  return d[m][n];
}

// Snap a single mistyped token to the closest domain word, when it's a
// confident match. Conservative thresholds keep valid English untouched.
function correctToken(token) {
  if (token.length < 4 || VOCAB_SET.has(token) || PROTECTED.has(token)) return token;
  const cap = token.length <= 5 ? 1 : 2;
  let best = null;
  let bestDist = cap + 1;
  for (const word of VOCAB) {
    if (Math.abs(word.length - token.length) > cap) continue;
    const d = editDistance(token, word, cap);
    if (d < bestDist) {
      bestDist = d;
      best = word;
      if (d === 0) break;
    }
  }
  return best && bestDist <= cap ? best : token;
}

function normalizeText(text) {
  let value = text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  for (const [from, to] of Object.entries(TYPO_MAP)) {
    value = value.replace(new RegExp(`\\b${from}\\b`, "g"), to);
  }
  // Fuzzy-correct the remaining tokens against the domain vocabulary so
  // typos like "how has most win" or "who is wininng" still resolve.
  value = value
    .split(" ")
    .filter(Boolean)
    .map(correctToken)
    .join(" ");
  return value;
}

function containsAny(text, words) {
  const normalized = normalizeText(text);
  return words.some((word) => normalized.includes(word));
}

function statLine(p) {
  if (p.games === 0) {
    return `${p.name}: no games on record yet${p.rarelyAvailable ? " (he's N/A most days)" : ""}`;
  }
  return `${p.name}: ${plural(p.wins, "point")} (wins), ${plural(p.losses, "loss", "losses")}, ${plural(p.games, "game")}, ${pct(p.ratio)} win ratio`;
}

function title(i) {
  const t = rankTitleFor(i, PLAYERS.length);
  return `${t.emoji} "${t.title}"`;
}

function formatDate(day) {
  return new Date(`${day}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function extractDate(q) {
  // Separators may be /, -, ., or spaces (normalizeText strips punctuation).
  const match = q.match(/\b(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2,4})\b/);
  if (!match) return null;
  const [, day, month, year] = match;
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daySummary(day, results) {
  const rows = results.filter((r) => gameDate(r) === day);
  if (rows.length === 0) return null;
  const totals = assignTitles(computeTotals(rows)).filter((p) => p.games > 0);
  if (totals.length === 0) return null;
  return {
    day,
    rows,
    top: totals[0],
    bottom: totals[totals.length - 1],
  };
}

// Recent form for a player: net result (W−L) of their last few entries, newest first.
function formLine(name, results) {
  const rows = [...results]
    .filter((r) => r.player === name)
    .sort(
      (a, b) =>
        gameDate(b).localeCompare(gameDate(a)) ||
        new Date(b.created_at) - new Date(a.created_at)
    )
    .slice(0, 5);
  if (rows.length === 0) return null;
  const marks = rows.map((r) =>
    r.wins > r.losses ? "🟢" : r.wins < r.losses ? "🔴" : "⚪"
  );
  return `${name}'s recent form (newest → oldest): ${marks.join(" ")} — ${rows
    .map((r) => `${r.wins}W/${r.losses}L`)
    .join(", ")}`;
}

// Insights the bot derives straight from whatever data is in the DB.
function liveInsights(results, totals) {
  const actives = totals.filter((p) => p.games > 0);
  if (actives.length === 0) return null;
  const busiest = [...actives].sort((a, b) => b.games - a.games)[0];
  const sharpest = [...actives].sort((a, b) => b.ratio - a.ratio)[0];
  const leader = actives[0];
  const runnerUp = actives[1];
  const bits = [
    `${leader.name} leads with ${plural(leader.wins, "point")}${
      runnerUp
        ? leader.wins > runnerUp.wins
          ? ` (${plural(leader.wins - runnerUp.wins, "point")} clear of ${runnerUp.name})`
          : ` (tied with ${runnerUp.name} on points)`
        : ""
    }`,
    `${busiest.name} has shown up the most with ${plural(busiest.games, "game")}`,
    `${sharpest.name} has the sharpest win ratio at ${pct(sharpest.ratio)}`,
  ];
  return bits.join(". ") + ".";
}

function findPlayers(q) {
  const found = [];
  for (const p of PLAYERS) {
    const idx = q.indexOf(p.name.toLowerCase());
    if (idx !== -1) found.push({ name: p.name, idx });
  }
  return found.sort((a, b) => a.idx - b.idx).map((f) => f.name);
}

export function explainOrder(a, b) {
  // a is ranked above b — explain why using the ranking rules.
  if (a.wins > b.wins) {
    let msg = `${a.name} is ahead of ${b.name} because ${a.name} has more points — ${a.wins} wins vs ${b.name}'s ${b.wins}. Ranking is by total wins (1 win = 1 point).`;
    if (a.ratio < b.ratio) {
      msg += ` Fun fact: ${b.name} actually has a better win ratio (${pct(b.ratio)} vs ${pct(a.ratio)}), but points decide the standings — ratio only breaks ties.`;
    }
    return msg;
  }
  if (a.wins === b.wins) {
    return `${a.name} and ${b.name} are tied on points (${a.wins} each), so it comes down to the tiebreaker: win ratio. ${a.name}'s ratio is ${pct(a.ratio)} vs ${b.name}'s ${pct(b.ratio)} — that's what puts ${a.name} in front. 🎯`;
  }
  return null;
}

export function answerQuestion(question, results) {
  const q = normalizeText(question);
  const totals = assignTitles(computeTotals(results)); // ranked best → worst, titled
  const actives = totals.filter((p) => p.games > 0);
  const rankOf = Object.fromEntries(totals.map((p, i) => [p.name, i]));
  const named = findPlayers(q);
  const hasGames = results.length > 0;
  const fmtTitle = (p) => `${p.rankTitle.emoji} "${p.rankTitle.title}"`;
  const day = extractDate(q);

  // Greetings / help
  if (/^(hi|hello|hey|yo|sasa|niaje|mambo)\b/.test(q)) {
    return `Hey! 🎱 I'm Osso — I know everything about this scoreboard. Ask me things like "who is winning?", "why is ${totals[0]?.name ?? "Brian"} in front of ${totals[1]?.name ?? "Alvin"}?", or "what happened on 3/4/2026?"`;
  }
  if (/osso|what.*your name|who are you/.test(q)) {
    return `I'm Osso 🎱 — this scoreboard's resident referee. Ask me who's winning, why someone is ranked where they are, or any player's stats.`;
  }
  if (/help|what can you|how do (i|you) use/.test(q)) {
    return `I can answer:\n• Who's winning / who's last\n• Why player X is ahead of player Y\n• Any player's points, losses, games or win ratio\n• Compare two players\n• What happened on a specific date\n• How the ranking works\n• Recent form and the penalty rule 🎱`;
  }

  // Someone actually apologising (not asking about the rule) → acknowledge,
  // no penalty. We only treat it as an apology when there's no rule/question
  // framing around it, so "what is the penalty rule?" still gets explained.
  const apologyIntent = /\b(sorry|apology|apologies|apologise|apologize|my bad|forgive|excuse me|i was (out|away|absent)|couldn.?t (make|come|attend)|wont? make it|will not make it)\b/.test(q);
  const rulePhrasing = /\b(rule|penalty|penalties|penal|fine|what|how|explain|does|work|when|why)\b/.test(q);
  if (apologyIntent && !rulePhrasing) {
    return `Apology noted ✅ — no penalty for you. As long as it lands within 24 hours of the game, you're fully covered and nothing is added to your record. Thanks for the heads up! 🎱`;
  }

  // Penalty rule for missing a game without an apology
  if (/penalt|apolog|miss(ed|ing)?.*game|skip|no ?show|absent|didn.?t (show|come|turn up)|fine/.test(q) || containsAny(q, ["apology", "penalty", "penal", "fine", "no penalty", "no penal", "should not be penalized"])) {
    return `Penalty rule ⚠️: if you miss a game and you're not there, you have 24 hours after the game has been played to submit your apology. If you send the apology within 24 hours, there is no penalty. If you do not, it becomes a 5-loss penalty (5 losses added to your record). Niven is the first to ever be penalised — he picked up his first penalty on Sunday, 5 Jul, for missing a game without an apology. 🎱`;
  }

  // Colo's availability
  if (/colo/.test(q) && /available|around|why.*(not|never|rarely).*(play|here)|where/.test(q)) {
    return `Colo is N/A most days — he rarely makes it to the table. When adding results, he's marked N/A by default; nothing is added or removed for him unless he actually plays. 🎱`;
  }

  // Ranking rules — only when it's a general "how does ranking work" question,
  // not "how many points does <player> have" (that names a player).
  if (
    !named.length &&
    !/how many|how much/.test(q) &&
    /\bhow\b.*(rank|standing|point|score|calculat|work)|what.*(rule|point system)/.test(q)
  ) {
    return `Here's how it works: every game win = 1 point. Players are ranked by total points; ties are broken by win ratio (wins ÷ games played), then fewer losses, then more games played. The titles go: #1 ${title(0)}, #2 ${title(1)}, #3 ${title(2)}, and last place is ${title(PLAYERS.length - 1)}. 🏆`;
  }

  if (/system|tracker|website|\bsite\b|\bapp\b|how does this work|end to end|what does this do|what can this app do|how does the system work/.test(q)) {
    return `This pool tracker is a simple results system: you add game results on the Details page, the leaderboard updates automatically, the Dashboard shows the overall standings and charts, the Overview page shows the top and bottom player for each date, and I answer questions about players, ranking, dates, recent form, and the rules. 🎱`;
  }

  if (!hasGames) {
    return `No games recorded yet! Go to the Details page and hit "+ Add Result" — then I'll have plenty to say. 🎱`;
  }

  if (day && /what happened|overview|summary|first|top|leader|winner|best|last|bottom|worst|loser|who was|who came/.test(q)) {
    const summary = daySummary(day, results);
    if (summary) {
      return `On ${formatDate(day)} the top spot was ${summary.top.name} with ${plural(summary.top.wins, "point")}, while ${summary.bottom.name} finished last with ${plural(summary.bottom.wins, "point")}.`;
    }
    return `I couldn't find a result for ${formatDate(day)} yet.`;
  }

  // "Why is X ahead of / in front of / above / beating Y"
  if (named.length >= 2 && /why|how come|ahead|in ?front|above|lead|beat|higher|before|over|front/.test(q)) {
    const a = totals[Math.min(rankOf[named[0]], rankOf[named[1]])];
    const b = totals[Math.max(rankOf[named[0]], rankOf[named[1]])];
    const askedWrongWay = rankOf[named[0]] > rankOf[named[1]] && /why/.test(q);
    const explanation = explainOrder(a, b);
    if (askedWrongWay) {
      return `Actually it's the other way round — ${a.name} is ahead of ${b.name}! ${explanation}`;
    }
    return explanation ?? `${a.name} is ahead of ${b.name} on the board.`;
  }

  // Compare two players
  if (named.length >= 2) {
    const [x, y] = [totals[rankOf[named[0]]], totals[rankOf[named[1]]]];
    const lead = rankOf[x.name] < rankOf[y.name] ? x : y;
    return `Head to head:\n• ${statLine(x)}\n• ${statLine(y)}\n${lead.name} is currently ranked higher (#${rankOf[lead.name] + 1} ${fmtTitle(lead)}). ${explainOrder(totals[Math.min(rankOf[x.name], rankOf[y.name])], totals[Math.max(rankOf[x.name], rankOf[y.name])]) ?? ""}`;
  }

  if (/who.*(most|highest|biggest|worst).*loss|who.*(lost|lose).*(most|more)|who.*has.*(most|highest|biggest|worst).*loss/.test(q)) {
    const p = [...actives].sort((a, b) => b.losses - a.losses)[0];
    return `${p.name} has the most losses — ${plural(p.losses, "loss", "losses")} out of ${plural(p.games, "game")}.`;
  }

  if (/who.*(fewest|least|lowest|smallest).*loss|who.*has.*(fewest|least|lowest|smallest).*loss/.test(q)) {
    const p = [...actives].sort((a, b) => a.losses - b.losses)[0];
    return `${p.name} has the fewest losses — ${plural(p.losses, "loss", "losses")} out of ${plural(p.games, "game")}.`;
  }

  // Best / worst ratio and game-count superlatives. These run before the
  // generic "who is winning" handler so "who has the best ratio" isn't
  // swallowed by the word "best", and "worst ratio" isn't caught by "worst".
  if (/(who|which|whos).*(best|highest|sharpest).*ratio|which player.*ratio/.test(q)) {
    const p = [...actives].sort((a, b) => b.ratio - a.ratio)[0];
    return `${p.name} has the best win ratio at ${pct(p.ratio)} from ${plural(p.games, "game")}.`;
  }

  if (/(who|which|whos).*(worst|lowest|poorest).*ratio/.test(q)) {
    const p = [...actives].sort((a, b) => a.ratio - b.ratio)[0];
    return `${p.name} has the lowest win ratio at ${pct(p.ratio)} from ${plural(p.games, "game")}.`;
  }

  if (/(who|which|whos).*(most|highest|more).*game|who has played the most games|most appearances/.test(q)) {
    const p = [...actives].sort((a, b) => b.games - a.games)[0];
    return `${p.name} has played the most games — ${plural(p.games, "game")}.`;
  }

  if (/(who|which|whos).*(fewest|least|lowest).*game|fewest games/.test(q)) {
    const p = [...actives].sort((a, b) => a.games - b.games)[0];
    return `${p.name} has played the fewest games — ${plural(p.games, "game")}.`;
  }

  // Who has the most wins / points (this is the leader, but users phrase it
  // as "who has most wins" — which used to fall through to the fallback).
  if (/(who|how|which|whos).*(most|highest|biggest|more).*(win|point|score)/.test(q)) {
    const p = actives[0];
    const runnerUp = actives[1];
    return `${p.name} has the most points — ${plural(p.wins, "point")} from ${plural(p.games, "game")}${
      runnerUp && p.wins > runnerUp.wins
        ? `, ${plural(p.wins - runnerUp.wins, "point")} ahead of ${runnerUp.name}`
        : ""
    }. That puts ${p.name} top as ${fmtTitle(p)}. 🏆`;
  }

  if (/(who|how|which|whos).*(fewest|least|lowest|smallest).*(win|point|score)/.test(q)) {
    const p = [...actives].sort((a, b) => a.wins - b.wins || a.ratio - b.ratio)[0];
    return `${p.name} has the fewest points — ${plural(p.wins, "point")} from ${plural(p.games, "game")}.`;
  }

  // Who is winning / leader / tonkaaa
  if (/who.*(winning|leading|best|first|top|number ?1|overall)|tonkaa|winner|champion/.test(q)) {
    const p = actives[0];
    const runnerUp = actives[1];
    return `${fmtTitle(p)} goes to ${p.name}! ${p.name} is currently number 1. ${statLine(p)}. ${
      runnerUp
        ? p.wins - runnerUp.wins > 0
          ? `That's ${plural(p.wins - runnerUp.wins, "point")} clear of ${runnerUp.name}.`
          : `${runnerUp.name} is tied on points though — it's decided on win ratio!`
        : ""
    } 🏆`;
  }

  // Who is second / third / podium
  if (/who.*(second|2nd|runner[- ]up|big man)/.test(q)) {
    const p = actives[1] ?? totals[1];
    return `${fmtTitle(p)} ${p.name} is in second place. ${statLine(p)}.`;
  }

  if (/who.*(third|3rd|good job)/.test(q)) {
    const p = actives[2] ?? totals[2];
    return `${fmtTitle(p)} ${p.name} is in third place. ${statLine(p)}.`;
  }

  // Top three / bottom three
  if (/show (top|best) 3|top three|podium|top 3/.test(q)) {
    return totals
      .slice(0, 3)
      .map((p, i) => `#${i + 1} ${fmtTitle(p)} — ${p.name}: ${plural(p.wins, "point")}`)
      .join("\n");
  }

  if (/show (bottom|worst|last) 3|bottom three|last three/.test(q)) {
    return totals
      .slice(-3)
      .reverse()
      .map((p, i) => `#${totals.length - i} ${fmtTitle(p)} — ${p.name}: ${plural(p.wins, "point")}`)
      .join("\n");
  }

  // Rank of a player / is X ahead of Y
  if (named.length === 1 && /rank|position|where (is|was)|what place|place in/.test(q)) {
    const p = totals[rankOf[named[0]]];
    return `${p.name} is currently ranked #${rankOf[p.name] + 1} ${fmtTitle(p)}. ${statLine(p)}.`;
  }

  if (named.length >= 2 && /is .* ahead of .*|is .* better than .*|does .* lead .*|is .* behind .*|losing to/.test(q)) {
    const first = totals[rankOf[named[0]]];
    const second = totals[rankOf[named[1]]];
    const ahead = rankOf[first.name] < rankOf[second.name] ? first : second;
    const behind = ahead.name === first.name ? second : first;
    return `${ahead.name} is currently ahead of ${behind.name}. ${explainOrder(totals[Math.min(rankOf[first.name], rankOf[second.name])], totals[Math.max(rankOf[first.name], rankOf[second.name])]) ?? ""}`;
  }

  // Did X win / lose / how did X do
  if (/did .* (win|lose)|how did .* do|what about .* today|what happened with /.test(q)) {
    const target = named[0];
    if (!target) {
      return "I can do that if you name a player, like “did Brian win today?”";
    }
    const latest = [...results]
      .filter((r) => r.player === target)
      .sort((a, b) => gameDate(b).localeCompare(gameDate(a)) || new Date(b.created_at) - new Date(a.created_at))[0];
    if (!latest) {
      return `${target} has no recent results on record yet.`;
    }
    const outcome = latest.wins > latest.losses ? "won" : latest.wins < latest.losses ? "lost" : "split";
    return `${target} most recently ${outcome} ${latest.wins}–${latest.losses} on ${formatDate(gameDate(latest))}.`;
  }

  // Who is last / worst / nyanganya (worst among players who actually played)
  if (/who.*(last|worst|losing|bottom|behind)|nyanganya|loser/.test(q)) {
    const p = actives[actives.length - 1];
    return `Bottom of the table, ${fmtTitle(p)}: ${p.name} 😅 ${statLine(p)}. There's always next game!`;
  }

  // Standings / leaderboard / table
  if (/standing|leaderboard|table|rank|position|order|everyone|all player|stats|summary/.test(q)) {
    return totals
      .map((p, i) => `#${i + 1} ${fmtTitle(p)} — ${statLine(p)}`)
      .join("\n");
  }

  // Total games
  if (/how many.*(game|match|session)|total game/.test(q)) {
    const games = results.reduce((s, r) => s + r.wins + r.losses, 0);
    return `There are ${games} game results on the board across ${results.length} recorded entries. 🎱`;
  }

  // Recent results (but "recent form" should show the form view below)
  if (
    !/form|streak|trend|momentum|hot|cold/.test(q) &&
    /recent|latest|last (game|result|session)|yesterday|today/.test(q)
  ) {
    const recent = [...results]
      .sort(
        (a, b) =>
          gameDate(b).localeCompare(gameDate(a)) ||
          new Date(b.created_at) - new Date(a.created_at)
      )
      .slice(0, 5);
    return (
      "Most recent entries:\n" +
      recent
        .map(
          (r) =>
            `• ${new Date(gameDate(r)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} — ${r.player}: ${r.wins}W / ${r.losses}L`
        )
        .join("\n")
    );
  }

  // Form / streaks / momentum — derived live from recent results
  if (/form|streak|trend|hot|cold|momentum|improv|recent.*(play|perform)/.test(q)) {
    if (named.length >= 1) {
      const lines = named.map((n) => formLine(n, results)).filter(Boolean);
      if (lines.length) return lines.join("\n");
    }
    const all = actives.map((p) => formLine(p.name, results)).filter(Boolean);
    return all.length
      ? "Recent form 🟢 win / 🔴 loss / ⚪ even:\n" + all.join("\n")
      : `No games on record yet to read form from. 🎱`;
  }

  // Single player questions (ratio, points, wins, losses, or just their name)
  if (named.length === 1) {
    const p = totals[rankOf[named[0]]];
    const rank = rankOf[p.name];
    if (p.games === 0) {
      return `${p.name} has no games on record yet${p.rarelyAvailable ? " — he's N/A most days" : ""}, so there are no points or ratio to show. 🎱`;
    }
    if (/ratio|percent/.test(q)) {
      return `${p.name}'s win ratio is ${pct(p.ratio)} (${p.wins} wins out of ${p.games} games).`;
    }
    if (/loss|lost/.test(q)) {
      return `${p.name} has ${p.losses} losses out of ${p.games} games.`;
    }
    if (/point|win|score|record/.test(q)) {
      return `${p.name} has ${plural(p.wins, "point")} (each win = 1 point) from ${plural(p.games, "game")}.`;
    }
    if (/tell me about|info about|details about|summary about/.test(q)) {
      return `${p.name} is ranked #${rank + 1} ${fmtTitle(p)}. ${statLine(p)}.`;
    }
    return `${p.name} is ranked #${rank + 1} ${fmtTitle(p)}. ${statLine(p)}.`;
  }

  // Ratio for everyone
  if (/ratio|percent/.test(q)) {
    return (
      "Win ratios:\n" +
      totals.map((p) => `• ${p.name}: ${pct(p.ratio)} (${p.wins}W / ${p.losses}L)`).join("\n")
    );
  }

  // Fallback: instead of a dead end, share a live insight straight from the data.
  const insight = liveInsights(results, totals);
  if (insight) {
    return `I didn't quite catch that, but here's what the data says right now 🎱\n${insight}`;
  }
  return `I can answer questions about the standings, player records, recent form, comparisons, dates, and the penalty rule. Ask me something specific about the pool table. 🎱`;
}
