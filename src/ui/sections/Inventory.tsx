import { useState } from 'react';
import { usePlayer, useToasts, isTrailUnlocked } from '../../store/playerStore';
import { SKINS, TRAILS, RARITY_COLOR, charById, resolvePalette } from '../../data/characters';
import { ACHIEVEMENTS } from '../../data/achievements';
import { BadgeArt, CollectibleArt, Portrait } from '../Art';
import { sound } from '../../audio/sound';

const COLLECTIBLES = [
  { id: 'c1', name: 'Genesis Core', color: '#a855f7', req: 'Play 1 round', check: (g: number) => g >= 1 },
  { id: 'c2', name: 'Neon Relic', color: '#39ff88', req: 'Play 10 rounds', check: (g: number) => g >= 10 },
  { id: 'c3', name: 'Void Shard', color: '#22d3ee', req: 'Play 25 rounds', check: (g: number) => g >= 25 },
  { id: 'c4', name: 'Overlord Sigil', color: '#fbbf24', req: 'Play 50 rounds', check: (g: number) => g >= 50 },
];

type T = 'skins' | 'trails' | 'collectibles' | 'badges';

export function InventorySection() {
  const p = usePlayer();
  const push = useToasts((s) => s.push);
  const [tab, setTab] = useState<T>('skins');
  const char = charById(p.equipped.character);
  const res = (r: { ok: boolean; message: string }) => { push({ title: r.ok ? 'SUCCESS' : 'NOPE', body: r.message, tone: r.ok ? 'good' : 'bad' }); sound.play(r.ok ? 'boost' : 'click'); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="section-title">INVENTORY</h1>
        <div className="flex overflow-hidden rounded-lg border border-white/15">
          {(['skins', 'trails', 'collectibles', 'badges'] as T[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); sound.play('click'); }} className={`px-3 py-2 font-display text-[10px] tracking-widest sm:px-4 ${tab === t ? 'bg-neon-purple text-white' : 'text-white/60 hover:bg-white/5'}`}>{t.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <p className="text-sm text-white/50">
        Cosmetics are bought with virtual arena coins (Ð), which have no real-world value. On-chain versions of these items are planned for Base and will only appear after verified ownership.
      </p>

      {tab === 'skins' && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {SKINS.map((s) => {
            const owned = p.owned.skins.includes(s.id);
            const on = p.equipped.skin === s.id;
            return (
              <div key={s.id} className={`panel overflow-hidden ${on ? 'ring-2 ring-neon-green' : ''}`}>
                <Portrait id={char.id} palette={resolvePalette(char, s.id)} size={300} className="h-auto w-full" />
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold">{s.name}</div>
                    <span className="text-[10px] font-bold" style={{ color: RARITY_COLOR[s.rarity] }}>{s.rarity.toUpperCase()}</span>
                  </div>
                  <div className="mt-2">
                    {owned ? (
                      <button className="btn-ghost w-full py-2" disabled={on} onClick={() => { p.equipSkin(s.id); sound.play('click'); }}>{on ? '✓ EQUIPPED' : 'EQUIP'}</button>
                    ) : (
                      <button className="btn-purple w-full" disabled={p.coins < s.price} onClick={() => res(p.buySkin(s.id))}>BUY · Ð {s.price}</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'trails' && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {TRAILS.map((t) => {
            const un = isTrailUnlocked(p, t.id);
            const on = p.equipped.trail === t.id;
            return (
              <div key={t.id} className={`panel p-4 ${on ? 'ring-2 ring-neon-green' : ''}`}>
                <div className="h-20 rounded-lg" style={{ background: `linear-gradient(90deg, transparent, ${t.color})`, boxShadow: `0 0 24px ${t.color}55` }} />
                <div className="mt-3 text-sm font-bold">{t.name}</div>
                <div className="text-xs text-white/50">Dash trail + player ring</div>
                <div className="mt-3">
                  {un ? (
                    <button className="btn-ghost w-full py-2" disabled={on} onClick={() => { p.equipTrail(t.id); sound.play('click'); }}>{on ? '✓ EQUIPPED' : 'EQUIP'}</button>
                  ) : t.level ? (
                    <div className="rounded-md border border-white/15 py-2 text-center text-xs text-white/60">🔒 Level {t.level}</div>
                  ) : (
                    <button className="btn-purple w-full" disabled={p.coins < t.price} onClick={() => res(p.buyTrail(t.id))}>BUY · Ð {t.price}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'collectibles' && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {COLLECTIBLES.map((c, i) => {
            const got = c.check(p.gamesPlayed);
            return (
              <div key={c.id} className="panel overflow-hidden">
                <div className={got ? '' : 'opacity-25 grayscale'}><CollectibleArt seed={i + 1} color={c.color} size={300} /></div>
                <div className="p-3">
                  <div className="text-sm font-bold">{c.name}</div>
                  <div className="text-xs text-white/50">{got ? 'Collected (in-game only)' : c.req}</div>
                  <div className="mt-1 text-[10px] tracking-widest text-blue-300/70">PREVIEW · NOT MINTED</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'badges' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ACHIEVEMENTS.map((a) => {
            const got = p.achievements.includes(a.id);
            return (
              <div key={a.id} className={`panel flex flex-col items-center p-4 text-center ${got ? '' : 'opacity-70'}`}>
                <BadgeArt icon={a.icon} color={a.color} earned={got} size={80} />
                <div className="mt-2 text-sm font-bold">{a.name}</div>
                <div className="text-[11px] text-white/50">{a.desc}</div>
                <div className={`mt-1 text-[10px] font-bold ${got ? 'text-neon-green' : 'text-white/40'}`}>{got ? 'EARNED' : `+Ð ${a.reward}`}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
