import { lazy, Suspense, useState } from 'react';
import { usePlayer, useToasts, isCharacterUnlocked } from '../../store/playerStore';
import { CHARACTERS, RARITY_COLOR, resolvePalette, type CharacterId } from '../../data/characters';
import { levelFromXp } from '../../data/levels';
import { Portrait } from '../Art';
import { sound } from '../../audio/sound';

const CharacterShowcase = lazy(() => import('../Showcase').then((m) => ({ default: m.CharacterShowcase })));

function Bar({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-12 font-bold tracking-widest text-white/50">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${v * 20}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
      <span className="w-4 text-right font-display text-white/70">{v}</span>
    </div>
  );
}

export function CharactersSection() {
  const p = usePlayer();
  const push = useToasts((s) => s.push);
  const [sel, setSel] = useState<CharacterId>(p.equipped.character);
  const def = CHARACTERS.find((c) => c.id === sel)!;
  const unlocked = isCharacterUnlocked(p, sel);
  const level = levelFromXp(p.xp).level;
  const equipped = p.equipped.character === sel;
  const accent = def.palette.accent;

  const buy = () => {
    const r = p.buyCharacter(sel);
    push({ title: r.ok ? 'UNLOCKED' : 'CANNOT UNLOCK', body: r.message, tone: r.ok ? 'good' : 'bad' });
    sound.play(r.ok ? 'levelup' : 'click');
  };

  return (
    <div className="panel-glow overflow-hidden p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-center gap-3">
        <span className="h-px w-10 bg-gradient-to-r from-transparent to-neon-purple sm:w-24" />
        <h1 className="section-title text-center">CHARACTER SELECTION</h1>
        <span className="h-px w-10 bg-gradient-to-l from-transparent to-neon-purple sm:w-24" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* portrait grid */}
        <div className="order-2 grid grid-cols-3 content-start gap-2.5 sm:gap-3 lg:order-1">
          {CHARACTERS.map((c) => {
            const un = isCharacterUnlocked(p, c.id);
            return (
              <button
                key={c.id}
                onClick={() => { setSel(c.id); sound.play('click'); }}
                className={`char-tile text-left ${sel === c.id ? 'selected' : ''}`}
                aria-pressed={sel === c.id}
              >
                <Portrait id={c.id} size={240} locked={!un} className="h-auto w-full" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6">
                  <div className="truncate font-display text-[10px] font-bold tracking-wider sm:text-xs">{c.name.toUpperCase()}</div>
                  <div className="text-[9px] font-bold tracking-widest" style={{ color: RARITY_COLOR[c.rarity] }}>{c.rarity.toUpperCase()}</div>
                </div>
                {p.equipped.character === c.id && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-neon-green text-[10px] font-black text-black">✓</span>}
                {c.unlock.nftOnly && <span className="chip absolute left-1.5 top-1.5 border-blue-400 bg-black/70 text-blue-300">NFT</span>}
              </button>
            );
          })}
          {/* empty slots keep the 3-column grid tidy, like a roster */}
          <div className="char-tile grid aspect-square place-items-center opacity-40">
            <span className="font-display text-[10px] tracking-widest text-white/50">COMING<br />SOON</span>
          </div>
        </div>

        {/* hero */}
        <div className="brackets relative order-1 overflow-hidden rounded-2xl border border-white/10 bg-black/30 lg:order-2">
          <div className="absolute inset-0" style={{ background: `radial-gradient(70% 60% at 50% 40%, ${accent}40, transparent 70%)` }} />
          <div className="relative h-72 sm:h-[400px]">
            <Suspense fallback={<div className="grid h-full place-items-center text-white/40">Loading 3D…</div>}>
              <CharacterShowcase variant={sel} palette={resolvePalette(def, equipped ? p.equipped.skin : 'default')} quality={p.settings.quality} locked={!unlocked} />
            </Suspense>
            <span className="chip absolute left-4 top-4 bg-black/60" style={{ color: RARITY_COLOR[def.rarity], borderColor: RARITY_COLOR[def.rarity] }}>{def.rarity.toUpperCase()}</span>
            {!unlocked && <span className="chip absolute right-4 top-4 border-white/30 bg-black/60 text-white/70">🔒 LOCKED</span>}
          </div>
          <div className="relative border-t border-white/10 bg-black/40 p-4 sm:p-5">
            <h2 className="font-display text-2xl font-black tracking-wider" style={{ textShadow: `0 0 18px ${accent}` }}>{def.name.toUpperCase()}</h2>
            <p className="text-sm" style={{ color: accent }}>{def.title}</p>
            <p className="mt-2 text-sm text-white/60">{def.lore}</p>
            <div className="mt-4 space-y-2">
              <Bar label="SPEED" v={def.stats.speed} color="#39ff88" />
              <Bar label="DASH" v={def.stats.dash} color="#22d3ee" />
              <Bar label="ARMOR" v={def.stats.armor} color="#a855f7" />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {unlocked ? (
                <button
                  className="btn-gold min-w-[160px]"
                  disabled={equipped}
                  onClick={() => { p.equipCharacter(sel); sound.play('click'); push({ title: 'EQUIPPED', body: def.name, tone: 'good' }); }}
                >
                  {equipped ? '✓ SELECTED' : 'SELECT'}
                </button>
              ) : def.unlock.nftOnly ? (
                <div className="rounded-lg border border-blue-400/40 bg-blue-400/10 p-3 text-sm text-blue-200">
                  NFT-gated character. It will unlock after verified ownership on Base once the collection launches. Nothing is minted yet.
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm">
                    Unlocks at <b className="text-neon-purple">level {def.unlock.level}</b> (you are {level})
                  </div>
                  {def.unlock.price && (
                    <button className="btn-gold" disabled={p.coins < def.unlock.price} onClick={buy}>
                      UNLOCK · Ð {def.unlock.price.toLocaleString()}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
