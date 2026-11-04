import { lazy, Suspense } from 'react';
import { usePlayer } from '../../store/playerStore';
import { levelFromXp } from '../../data/levels';
import { charById, resolvePalette } from '../../data/characters';
import { demoPlayers } from '../../data/demoLeaderboard';
import { MISSIONS } from '../../data/missions';
import type { Tab } from '../Dashboard';

const CharacterShowcase = lazy(() => import('../Showcase').then((m) => ({ default: m.CharacterShowcase })));

export function StatCard({ label, value, accent = 'text-white', sub }: { label: string; value: string | number; accent?: string; sub?: string }) {
  return (
    <div className="panel p-4">
      <div className="text-[10px] font-bold tracking-[0.25em] text-white/45">{label}</div>
      <div className={`mt-1 font-display text-2xl font-black tabular-nums ${accent}`}>{value}</div>
      {sub && <div className="text-xs text-white/40">{sub}</div>}
    </div>
  );
}

function Ring({ value, label, big, color }: { value: number; label: string; big: string; color: string }) {
  const C = 2 * Math.PI * 40;
  return (
    <div className="ring-stat h-[88px] w-[88px]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r="40" fill="rgba(0,0,0,.35)" stroke="rgba(255,255,255,.08)" strokeWidth="7" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - value)} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      </svg>
      <div className="relative text-center leading-none">
        <div className="font-display text-lg font-black">{big}</div>
        <div className="mt-1 text-[9px] font-bold tracking-widest text-white/50">{label}</div>
      </div>
    </div>
  );
}

export function rankFor(bestScore: number, kind: 'weekly' | 'alltime' = 'alltime') {
  const rows = demoPlayers(kind);
  return rows.filter((r) => r.bestScore > bestScore).length + 1;
}

export function HomeSection({ onPlay, go }: { onPlay: () => void; go: (t: Tab) => void }) {
  const p = usePlayer();
  const lvl = levelFromXp(p.xp);
  const def = charById(p.equipped.character);
  const palette = resolvePalette(def, p.equipped.skin);
  const rank = p.gamesPlayed ? rankFor(p.bestScore) : null;
  const daily = MISSIONS.filter((m) => m.period === 'daily');

  return (
    <div className="space-y-6">
      {/* hero */}
      <section className="panel-glow scanlines relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_50%,rgba(168,85,247,.35),transparent_55%)]" />
        <div className="relative grid items-center gap-2 md:grid-cols-[1.05fr_1fr_auto]">
          <div className="p-6 sm:p-8">
            <div className="chip border-neon-green/50 text-neon-green">● SEASON 0 · COIN SURVIVAL LIVE</div>
            <div className="mt-4 font-display text-[11px] tracking-[0.35em] text-white/50">CURRENT RANK</div>
            <h1 className="font-display text-4xl font-black leading-none tracking-wider sm:text-6xl">
              <span className="block text-white">{lvl.title.split(' ')[0].toUpperCase()}</span>
              <span className="block bg-gradient-to-r from-neon-purple via-fuchsia-400 to-neon-green bg-clip-text text-transparent">
                {(lvl.title.split(' ').slice(1).join(' ') || 'DEGEN').toUpperCase()}
              </span>
            </h1>
            <p className="mt-3 font-display text-xs tracking-[0.3em] text-white/60">ENTER THE ARENA · FIGHT FOR GLORY · CLAIM YOUR RANK</p>
            <p className="mt-4 max-w-md text-white/70">
              60 seconds. One floating arena. Grab energy coins, jump over lasers, outrun rival degens and climb the leaderboard. No wallet needed.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="btn-primary" onClick={onPlay}>▶ PLAY NOW</button>
              <button className="btn-ghost" onClick={() => go('characters')}>CHANGE CHARACTER</button>
            </div>
          </div>
          {/* stat rings column (desktop) */}
          <div className="order-3 hidden flex-col gap-4 pr-8 md:flex">
            <Ring value={lvl.progress} label="LEVEL" big={String(lvl.level)} color="#a855f7" />
            <Ring value={Math.min(1, p.bestScore / 2000)} label="BEST" big={p.bestScore >= 1000 ? `${(p.bestScore / 1000).toFixed(1)}k` : String(p.bestScore)} color="#39ff88" />
            <Ring value={Math.min(1, p.streak.count / 7)} label="STREAK" big={`${p.streak.count}d`} color="#fbbf24" />
          </div>
          <div className="relative h-72 sm:h-96">
            <Suspense fallback={<div className="grid h-full place-items-center text-white/40">Loading 3D…</div>}>
              <CharacterShowcase variant={def.id} palette={palette} quality={p.settings.quality} />
            </Suspense>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-center">
              <div className="font-display text-sm font-bold tracking-widest">{def.name.toUpperCase()}</div>
              <div className="text-xs text-white/50">{def.title}</div>
            </div>
          </div>
        </div>
      </section>

      {/* player card + stats */}
      <section className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold tracking-[0.25em] text-white/45">PLAYER</div>
              <div className="font-display text-xl font-black">{p.username}</div>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl font-black text-neon-purple">LV {lvl.level}</div>
              <div className="text-xs font-bold text-white/60">{lvl.title.toUpperCase()}</div>
            </div>
          </div>
          <div className="mt-4 flex justify-between text-xs font-semibold text-white/50">
            <span>XP PROGRESS</span>
            <span>{lvl.level >= 10 ? 'MAX LEVEL' : `${p.xp - lvl.cur} / ${lvl.next - lvl.cur}`}</span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-neon-purple to-neon-green shadow-green" style={{ width: `${lvl.progress * 100}%` }} />
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3">
            <span className="text-2xl" aria-hidden>🔥</span>
            <div>
              <div className="font-display text-lg font-black text-amber-300">{p.streak.count} DAY STREAK</div>
              <div className="text-xs text-white/50">Play a round every day to keep it alive.</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="ARENA COINS" value={p.coins.toLocaleString()} accent="text-neon-green" sub="Virtual, not crypto" />
          <StatCard label="BEST SCORE" value={p.bestScore.toLocaleString()} accent="text-amber-300" />
          <StatCard label="GAMES PLAYED" value={p.gamesPlayed} />
          <StatCard label="TOTAL XP" value={p.xp.toLocaleString()} accent="text-neon-purple" />
          <StatCard label="CURRENT RANK" value={rank ? `#${rank}` : '—'} accent="text-cyan-300" sub={rank ? 'vs demo leaderboard' : 'Play to get ranked'} />
          <StatCard label="COINS COLLECTED" value={p.totals.coins.toLocaleString()} />
        </div>
      </section>

      {/* daily missions preview */}
      <section className="panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="section-title text-base sm:text-lg">TODAY'S MISSIONS</h2>
          <button className="text-sm font-bold text-neon-green hover:underline" onClick={() => go('missions')}>View all →</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {daily.map((m) => {
            const v = Math.min(m.target, p.daily.c[m.stat]);
            return (
              <div key={m.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-sm font-bold">{m.title}</div>
                <div className="text-xs text-white/50">{m.desc}</div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-neon-green" style={{ width: `${(v / m.target) * 100}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-white/50">{v}/{m.target}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
