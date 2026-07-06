export default function Leaderboard({ totals, onSelect }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {totals.map((p, i) => {
        const rank = p.rankTitle;
        return (
          <button
            key={p.name}
            type="button"
            onClick={() => onSelect?.(p)}
            title={`See ${p.name}'s details`}
            className={`glass rise rise-${Math.min(i + 1, 5)} relative cursor-pointer rounded-3xl p-5 text-center transition-transform duration-300 hover:scale-[1.03]`}
            style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.35), inset 0 3px 0 ${p.color}` }}
          >
            {p.rarelyAvailable && (
              <span className="absolute right-3 top-3 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-100/60 ring-1 ring-white/15">
                N/A most days
              </span>
            )}
            <div className="text-4xl">{rank.emoji}</div>
            <div className="mt-2 text-lg font-extrabold tracking-tight" style={{ color: p.color }}>
              {p.name}
            </div>
            <div className="serif-accent text-xl">“{rank.title}”</div>
            <div className="mt-4 flex justify-center gap-4 text-sm">
              <span>
                <b className="text-2xl font-extrabold tracking-tight">{p.wins}</b>
                <span className="block text-xs text-emerald-200/50">points</span>
              </span>
              <span>
                <b className="text-2xl font-extrabold tracking-tight">{p.losses}</b>
                <span className="block text-xs text-emerald-200/50">losses</span>
              </span>
              <span>
                <b className="text-2xl font-extrabold tracking-tight">{p.games}</b>
                <span className="block text-xs text-emerald-200/50">games</span>
              </span>
              <span>
                <b className="text-2xl font-extrabold tracking-tight">{p.games > 0 ? `${Math.round(p.ratio * 100)}%` : "—"}</b>
                <span className="block text-xs text-emerald-200/50">ratio</span>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
