import { useEffect, useMemo, useState } from 'react';
import { usePlayer } from '../../store/playerStore';
import { fetchLeaderboard } from '../../services/backend';
import { levelFromXp } from '../../data/levels';
import type { LeaderRow } from '../../data/demoLeaderboard';
import { Portrait } from '../Art';
import { sound } from '../../audio/sound';

const MEDAL = ['#fbbf24', '#cbd5e1', '#f97316'];

export function LeaderboardSection() {
  const p = usePlayer();
  const [kind, setKind] = useState<'weekly' | 'alltime'>('alltime');
  const [data, setData] = useState<{ rows: LeaderRow[]; demo: boolean } | null>(null);

  useEffect(() => {
    let live = true;
    setData(null);
    fetchLeaderboard(kind).then((d) => live && setData(d));
    return () => { live = false; };
  }, [kind]);

  // Merge the local player in so they can see where they stand.
  const rows = useMemo(() => {
    if (!data) return [];
    const out = [...data.rows];
    if (data.demo && p.gamesPlayed > 0) {
      const weeklyXp = p.weekly.c.rounds > 0 ? Math.round(p.weekly.c.bestScore / 5 + p.weekly.c.playSeconds) : 0;
      out.push({
        id: 'you', username: p.username, avatar: p.equipped.character, level: levelFromXp(p.xp).level,
        xp: kind === 'weekly' ? weeklyXp : p.xp, bestScore: kind === 'weekly' ? p.weekly.c.bestScore : p.bestScore,
        games: kind === 'weekly' ? p.weekly.c.rounds : p.gamesPlayed, isDemo: false, isYou: true,
      });
    }
    return out.sort((a, b) => b.bestScore - a.bestScore || b.xp - a.xp).slice(0, 51);
  }, [data, p, kind]);

  const top = rows.slice(0, 3);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="section-title">GLOBAL LEADERBOARD</h1>
          {data?.demo && <p className="mt-1 text-sm text-amber-300/80">⚠ Showing DEMO players. Real rankings appear once Supabase is connected and players submit scores.</p>}
        </div>
        <div className="flex overflow-hidden rounded-lg border border-white/15">
          {(['weekly', 'alltime'] as const).map((k) => (
            <button key={k} onClick={() => { setKind(k); sound.play('click'); }} className={`px-4 py-2 font-display text-[10px] tracking-widest ${kind === k ? 'bg-neon-purple text-white' : 'text-white/60 hover:bg-white/5'}`}>
              {k === 'weekly' ? 'WEEKLY' : 'ALL-TIME'}
            </button>
          ))}
        </div>
      </div>

      {!data && <div className="panel p-10 text-center text-white/50">Loading rankings…</div>}

      {data && (
        <>
          <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
            {[1, 0, 2].map((i) => {
              const r = top[i];
              if (!r) return <div key={i} />;
              return (
                <div key={r.id} className={`panel relative flex flex-col items-center overflow-hidden p-3 text-center sm:p-5 ${i === 0 ? 'pb-8 sm:pb-10' : ''}`} style={{ borderColor: MEDAL[i], boxShadow: `0 0 28px ${MEDAL[i]}44` }}>
                  <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 50% 0%, ${MEDAL[i]}, transparent 70%)` }} />
                  <div className="relative font-display text-2xl font-black sm:text-3xl" style={{ color: MEDAL[i] }}>#{i + 1}</div>
                  <div className="relative mt-2 overflow-hidden rounded-full border-2" style={{ borderColor: MEDAL[i] }}><Portrait id={r.avatar} size={i === 0 ? 76 : 60} /></div>
                  <div className="relative mt-2 max-w-full truncate text-sm font-bold sm:text-base">{r.username}{r.isYou && ' (you)'}</div>
                  <div className="relative font-display text-lg font-black text-neon-green">{r.bestScore.toLocaleString()}</div>
                  <div className="relative text-[10px] text-white/50">LV {r.level} · {r.xp.toLocaleString()} XP</div>
                  {r.isDemo && <span className="chip relative mt-1 border-amber-400/40 text-amber-300/80">DEMO</span>}
                </div>
              );
            })}
          </div>

          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-white/5 text-left text-[10px] tracking-[0.2em] text-white/45">
                  <tr><th className="px-4 py-3">RANK</th><th className="px-2">PLAYER</th><th className="px-2">LEVEL</th><th className="px-2 text-right">TOTAL XP</th><th className="px-2 text-right">BEST SCORE</th><th className="px-4 text-right">GAMES</th></tr>
                </thead>
                <tbody>
                  {rows.slice(3).map((r, i) => (
                    <tr key={r.id} className={`border-t border-white/5 ${r.isYou ? 'bg-neon-green/10' : 'hover:bg-white/5'}`}>
                      <td className="px-4 py-2 font-display font-bold text-white/70">#{i + 4}</td>
                      <td className="px-2">
                        <div className="flex items-center gap-2">
                          <span className="overflow-hidden rounded-md"><Portrait id={r.avatar} size={28} /></span>
                          <span className={`font-semibold ${r.isYou ? 'text-neon-green' : ''}`}>{r.username}{r.isYou && ' (you)'}</span>
                          {r.isDemo && <span className="text-[9px] font-bold tracking-widest text-amber-300/60">DEMO</span>}
                        </div>
                      </td>
                      <td className="px-2">{r.level}</td>
                      <td className="px-2 text-right tabular-nums">{r.xp.toLocaleString()}</td>
                      <td className="px-2 text-right font-bold tabular-nums text-neon-green">{r.bestScore.toLocaleString()}</td>
                      <td className="px-4 text-right tabular-nums text-white/60">{r.games}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
