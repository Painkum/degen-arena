import { useState } from 'react';
import { usePlayer, useToasts } from '../../store/playerStore';
import { levelFromXp } from '../../data/levels';
import { charById } from '../../data/characters';
import { ACHIEVEMENTS } from '../../data/achievements';
import { BACKEND_MODE } from '../../services/backend';
import { BadgeArt, Portrait } from '../Art';
import { Settings } from '../Settings';
import { StatCard } from './Home';

export function ProfileSection() {
  const p = usePlayer();
  const push = useToasts((s) => s.push);
  const lvl = levelFromXp(p.xp);
  const [name, setName] = useState(p.username);
  const [confirmReset, setConfirmReset] = useState(false);
  const avg = p.history.length ? Math.round(p.history.reduce((s, h) => s + h.score, 0) / p.history.length) : 0;

  return (
    <div className="space-y-6">
      <h1 className="section-title">PROFILE</h1>
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="panel-glow p-5">
          <div className="flex items-center gap-4">
            <div className="overflow-hidden rounded-xl border-2 border-neon-purple shadow-neon"><Portrait id={p.equipped.character} size={88} /></div>
            <div>
              <div className="font-display text-xl font-black">{p.username}</div>
              <div className="text-sm text-neon-purple">LV {lvl.level} · {lvl.title}</div>
              <div className="text-xs text-white/40">Joined {new Date(p.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
          <form
            className="mt-5 flex gap-2"
            onSubmit={(e) => { e.preventDefault(); p.setUsername(name); push({ title: 'USERNAME SAVED', tone: 'good' }); }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={18}
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-neon-purple"
              aria-label="Username"
            />
            <button className="btn-purple" type="submit">SAVE</button>
          </form>
          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="mb-2 font-display text-xs tracking-[0.2em] text-white/50">SETTINGS</div>
            <Settings />
          </div>
          <div className="mt-6 border-t border-white/10 pt-4 text-xs text-white/45">
            {BACKEND_MODE === 'demo' ? 'Local demo mode: your progress is stored in this browser only.' : 'Progress synced with Supabase.'}
            <div className="mt-3">
              {confirmReset ? (
                <div className="flex gap-2">
                  <button className="btn-ghost border-rose-500/60 py-2 text-rose-300" onClick={() => { p.resetProgress(); setConfirmReset(false); push({ title: 'PROGRESS RESET', tone: 'info' }); }}>CONFIRM RESET</button>
                  <button className="btn-ghost py-2" onClick={() => setConfirmReset(false)}>CANCEL</button>
                </div>
              ) : (
                <button className="text-rose-300/80 underline" onClick={() => setConfirmReset(true)}>Reset local progress</button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="GAMES" value={p.gamesPlayed} />
            <StatCard label="BEST SCORE" value={p.bestScore.toLocaleString()} accent="text-amber-300" />
            <StatCard label="AVG SCORE" value={avg.toLocaleString()} />
            <StatCard label="ROUNDS SURVIVED" value={p.totals.survived} accent="text-neon-green" />
            <StatCard label="COINS GRABBED" value={p.totals.coins.toLocaleString()} />
            <StatCard label="RARE COINS" value={p.totals.rare} accent="text-neon-purple" />
            <StatCard label="CRYSTALS" value={p.totals.crystals} accent="text-cyan-300" />
            <StatCard label="TIME PLAYED" value={`${Math.floor(p.totals.playSeconds / 60)}m`} sub={`${p.totals.dashes} dashes`} />
          </div>

          <div className="panel p-5">
            <div className="font-display text-xs tracking-[0.2em] text-white/50">ACHIEVEMENTS · {p.achievements.length}/{ACHIEVEMENTS.length}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {ACHIEVEMENTS.map((a) => (
                <div key={a.id} title={`${a.name}: ${a.desc}`} className={p.achievements.includes(a.id) ? '' : 'opacity-40'}>
                  <BadgeArt icon={a.icon} color={a.color} earned={p.achievements.includes(a.id)} size={52} />
                </div>
              ))}
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="p-5 pb-2 font-display text-xs tracking-[0.2em] text-white/50">GAME HISTORY</div>
            {p.history.length === 0 ? (
              <div className="px-5 pb-6 text-sm text-white/45">No rounds yet. Hit PLAY NOW to start your history.</div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[10px] tracking-widest text-white/40">
                    <tr><th className="px-5 py-2">WHEN</th><th>CHARACTER</th><th className="text-right">SCORE</th><th className="text-right">COINS</th><th className="px-5 text-right">TIME</th></tr>
                  </thead>
                  <tbody>
                    {p.history.map((h) => (
                      <tr key={h.at} className="border-t border-white/5">
                        <td className="px-5 py-2 text-white/60">{new Date(h.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{charById(h.character).name}</td>
                        <td className="text-right font-bold text-neon-green">{h.score}</td>
                        <td className="text-right">{h.coins}</td>
                        <td className={`px-5 text-right ${h.survived ? 'text-neon-green' : 'text-rose-300'}`}>{h.survivalTime}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
