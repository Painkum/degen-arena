import { useEffect, useRef, useState } from 'react';
import { GameScene } from './GameScene';
import { TouchControls } from './TouchControls';
import { resetWorld, setPaused, setTrailColor, useRound, world } from './world';
import { input, queueDash, queueJump, resetInput } from './input';
import { usePlayer, type RoundOutcome } from '../store/playerStore';
import { charById, TRAILS } from '../data/characters';
import { mapById } from '../data/maps';
import { levelFromXp } from '../data/levels';
import { ACHIEVEMENTS } from '../data/achievements';
import { performanceRating } from '../lib/rules';
import { submitRound, BACKEND_MODE } from '../services/backend';
import { sound } from '../audio/sound';
import { Portrait } from '../ui/Art';
import { Settings } from '../ui/Settings';

const isTouch = typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);

export function GameScreen({ onExit, onLeaderboard }: { onExit: () => void; onLeaderboard: () => void }) {
  const player = usePlayer();
  const { character, skin, trail } = player.equipped;
  const trailColor = TRAILS.find((t) => t.id === trail)?.color ?? '#a855f7';
  const [roundKey, setRoundKey] = useState(() => {
    resetWorld(character);
    return 1;
  });
  const phase = useRound((s) => s.phase);
  const [outcome, setOutcome] = useState<(RoundOutcome & { source: string }) | null>(null);
  const submitted = useRef(0);

  useEffect(() => { setTrailColor(trailColor); }, [trailColor]);
  useEffect(() => { sound.unlock(); return () => { sound.setIntensity(0); resetInput(); }; }, []);

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) queueJump(); return; }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') { if (!e.repeat) queueDash(); return; }
      if (e.code === 'Escape' || e.code === 'KeyP') { setPaused(!world.paused); return; }
      input.keys.add(e.code);
    };
    const up = (e: KeyboardEvent) => input.keys.delete(e.code);
    const blur = () => { input.keys.clear(); if (world.phase === 'playing') setPaused(true); };
    const vis = () => { if (document.hidden) blur(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);

  // round finished -> validate + persist once
  useEffect(() => {
    if (phase !== 'ended' || submitted.current === roundKey) return;
    submitted.current = roundKey;
    const stats = useRound.getState().result!;
    submitRound(stats, usePlayer.getState().username).then((award) => {
      const out = usePlayer.getState().applyRound(stats, award);
      if (out.leveledUp) setTimeout(() => sound.play('levelup'), 600);
      setOutcome({ ...out, source: award.source });
    });
  }, [phase, roundKey]);

  const replay = () => {
    sound.play('click');
    resetInput();
    resetWorld(usePlayer.getState().equipped.character);
    setOutcome(null);
    setRoundKey((k) => k + 1);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-void">
      <GameScene
        quality={player.settings.quality}
        reducedMotion={player.settings.reducedMotion}
        character={character}
        skin={skin}
        trail={trailColor}
        roundKey={roundKey}
        map={player.map}
      />
      <HUD username={player.username} xp={player.xp} />
      {isTouch && phase === 'playing' && <TouchControls />}
      <Countdown />
      <PauseMenu onExit={onExit} onRestart={replay} />
      {phase === 'ended' && (
        outcome
          ? <Results outcome={outcome} onReplay={replay} onExit={onExit} onLeaderboard={onLeaderboard} />
          : <div className="absolute inset-0 grid place-items-center bg-black/60 font-display tracking-widest text-neon-green">VALIDATING ROUND…</div>
      )}
    </div>
  );
}

function fmt(t: number) {
  const s = Math.ceil(t);
  return `0:${String(Math.max(0, s)).padStart(2, '0')}`;
}

function HUD({ username, xp }: { username: string; xp: number }) {
  const r = useRound();
  const equipped = usePlayer((s) => s.equipped);
  const lvl = levelFromXp(xp);
  const [flash, setFlash] = useState(false);
  const [bump, setBump] = useState(false);
  useEffect(() => { if (r.hurtTick) { setFlash(true); const t = setTimeout(() => setFlash(false), 220); return () => clearTimeout(t); } }, [r.hurtTick]);
  useEffect(() => { if (r.score) { setBump(true); const t = setTimeout(() => setBump(false), 160); return () => clearTimeout(t); } }, [r.score]);
  const hpColor = r.health > 60 ? '#39ff88' : r.health > 30 ? '#fbbf24' : '#f43f5e';
  const urgent = r.timeLeft <= 10 && r.phase === 'playing';

  return (
    <div className="pointer-events-none absolute inset-0 font-body">
      {/* damage vignette */}
      <div className={`absolute inset-0 transition-opacity duration-200 ${flash ? 'opacity-100' : 'opacity-0'}`} style={{ boxShadow: 'inset 0 0 120px 30px rgba(244,63,94,.55)' }} />
      {r.health <= 30 && r.phase === 'playing' && <div className="absolute inset-0 animate-pulseglow" style={{ boxShadow: 'inset 0 0 90px 10px rgba(244,63,94,.35)' }} />}

      <div className="flex items-start justify-between gap-2 p-2 pt-[max(8px,env(safe-area-inset-top))] sm:p-4">
        {/* top-left: player */}
        <div className="hud-panel flex items-center gap-2 p-1.5 pr-3 sm:gap-3 sm:p-2 sm:pr-4">
          <div className="overflow-hidden rounded-md border border-neon-purple/60">
            <Portrait id={equipped.character} size={44} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="max-w-[90px] truncate text-sm font-bold text-white sm:max-w-none sm:text-base">{username}</span>
              <span className="rounded bg-neon-purple/30 px-1.5 font-display text-[10px] text-neon-purple">LV {lvl.level}</span>
            </div>
            <div className="mt-1 h-2.5 w-24 overflow-hidden rounded-full bg-white/10 sm:w-40">
              <div className="h-full rounded-full transition-all duration-200" style={{ width: `${r.health}%`, background: hpColor, boxShadow: `0 0 10px ${hpColor}` }} />
            </div>
            <div className="mt-0.5 flex gap-1.5 text-[10px] font-semibold text-white/60">
              <span>{Math.ceil(r.health)} HP</span>
              {r.buffs.shield > 0 && <span className="text-cyan-300">◆ SHIELD</span>}
              {r.buffs.speed > 0 && <span className="text-amber-300">» {Math.ceil(r.buffs.speed)}s</span>}
              {r.buffs.magnet > 0 && <span className="text-pink-400">◎ {Math.ceil(r.buffs.magnet)}s</span>}
            </div>
          </div>
        </div>

        {/* top-center: timer */}
        <div className="hud-panel flex flex-col items-center px-3 py-1 sm:px-6 sm:py-1.5">
          <div className={`font-display text-2xl font-black tabular-nums sm:text-4xl ${urgent ? 'animate-pulseglow text-rose-400' : 'text-white'}`}>{fmt(r.timeLeft)}</div>
          <div className="text-[9px] font-bold tracking-[0.3em] text-neon-green sm:text-[11px]">COIN SURVIVAL</div>
          <div className="hidden text-[9px] font-semibold tracking-[0.2em] text-white/50 sm:block">{mapById(usePlayer.getState().map).name.toUpperCase()}</div>
          <div className="mt-0.5 h-1 w-16 overflow-hidden rounded bg-white/10 sm:w-24" title="Difficulty">
            <div className="h-full bg-gradient-to-r from-neon-green via-amber-400 to-rose-500" style={{ width: `${r.difficulty * 100}%` }} />
          </div>
        </div>

        {/* top-right: score */}
        <div className="hud-panel relative min-w-[96px] px-3 py-1.5 text-right sm:min-w-[150px] sm:px-4">
          <div className="text-[10px] font-bold tracking-[0.25em] text-white/50">SCORE</div>
          <div className={`font-display text-xl font-black tabular-nums text-neon-green transition-transform sm:text-3xl ${bump ? 'scale-110' : ''}`}>{r.score.toLocaleString()}</div>
          <div className="text-xs font-semibold text-white/70"><span className="text-neon-green">●</span> {r.coins} coins</div>
          <div className="absolute right-2 top-full mt-1 flex flex-col items-end gap-1">
            {r.popups.map((p) => (
              <div key={p.id} className="animate-rise whitespace-nowrap font-display text-sm font-bold" style={{ color: p.color, textShadow: `0 0 10px ${p.color}` }}>{p.text}</div>
            ))}
          </div>
        </div>
      </div>

      {/* bottom: pause + desktop hints */}
      <button
        className="pointer-events-auto absolute left-1/2 top-[calc(max(8px,env(safe-area-inset-top))+78px)] -translate-x-1/2 rounded-md border border-white/20 bg-black/40 px-3 py-1 font-display text-[10px] tracking-widest text-white/80 backdrop-blur hover:border-neon-purple sm:top-auto sm:bottom-4"
        onClick={() => setPaused(true)}
        aria-label="Pause game"
      >
        ❚❚ PAUSE
      </button>
      {!isTouch && r.phase === 'playing' && (
        <div className="absolute bottom-4 left-4 hidden gap-2 text-[11px] font-semibold text-white/50 md:flex">
          <Key k="WASD" /> move <Key k="SPACE" /> jump (x2) <Key k="SHIFT" /> dash <Key k="DRAG" /> camera <Key k="Q/E" /> rotate <Key k="ESC" /> pause
        </div>
      )}
      {!isTouch && r.phase === 'playing' && (
        <div className="absolute bottom-4 right-4 w-40">
          <div className="mb-1 text-right font-display text-[10px] tracking-widest text-white/60">DASH</div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-neon-green shadow-green" style={{ width: `${Math.min(1, r.dashReady) * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function Key({ k }: { k: string }) {
  return <span className="rounded border border-white/25 bg-white/5 px-1.5 font-display text-[10px] text-white/80">{k}</span>;
}

function Countdown() {
  const phase = useRound((s) => s.phase);
  const countdown = useRound((s) => s.countdown);
  const [go, setGo] = useState(false);
  useEffect(() => {
    if (phase === 'playing') { setGo(true); const t = setTimeout(() => setGo(false), 700); return () => clearTimeout(t); }
  }, [phase]);
  if (phase === 'countdown') {
    return (
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div key={countdown} className="animate-pop font-display text-8xl font-black text-white" style={{ textShadow: '0 0 40px #a855f7' }}>{countdown}</div>
        <div className="mt-4 max-w-xs text-center font-body text-sm font-semibold text-white/70">
          Grab coins. Jump over lasers, shock pads and hammers. Dash through lasers and walls. Survive 60 seconds.
        </div>
      </div>
    );
  }
  if (go) return <div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="animate-pop font-display text-8xl font-black text-neon-green" style={{ textShadow: '0 0 40px #39ff88' }}>GO!</div></div>;
  return null;
}

function PauseMenu({ onExit, onRestart }: { onExit: () => void; onRestart: () => void }) {
  const paused = useRound((s) => s.paused);
  if (!paused) return null;
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-sm animate-rise p-6 text-center">
        <div className="font-display text-3xl font-black tracking-widest">PAUSED</div>
        <div className="mt-6 flex flex-col gap-3">
          <button className="btn-primary" onClick={() => { sound.play('click'); setPaused(false); }}>RESUME</button>
          <button className="btn-ghost" onClick={() => { setPaused(false); onRestart(); }}>RESTART ROUND</button>
          <button className="btn-ghost" onClick={() => { sound.play('click'); onExit(); }}>QUIT TO DASHBOARD</button>
        </div>
        <div className="mt-6 text-left"><Settings compact /></div>
        <p className="mt-4 text-xs text-white/40">Quitting mid-round does not record a score.</p>
      </div>
    </div>
  );
}

function Results({ outcome, onReplay, onExit, onLeaderboard }: { outcome: RoundOutcome & { source: string }; onReplay: () => void; onExit: () => void; onLeaderboard: () => void }) {
  const stats = useRound((s) => s.result)!;
  const reason = useRound((s) => s.endReason);
  const xp = usePlayer((s) => s.xp);
  const lvl = levelFromXp(xp);
  const rating = performanceRating(outcome.award.score, stats.survived);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    // count-up animation
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 1100);
      setShown(Math.round(outcome.award.score * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [outcome.award.score]);
  const coins = stats.normal + stats.rare + stats.crystals;
  const char = charById(stats.characterId as never);

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-black/75 backdrop-blur-sm">
      {outcome.newHigh && <Confetti />}
      <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center p-4">
        <div className="panel animate-rise p-5 sm:p-7">
          <div className="text-center">
            <div className={`font-display text-xs tracking-[0.4em] ${reason === 'time' ? 'text-neon-green' : 'text-rose-400'}`}>
              {reason === 'time' ? 'ROUND SURVIVED' : 'YOU GOT REKT'}
            </div>
            {outcome.newHigh && <div className="mt-2 animate-pop font-display text-lg font-black text-amber-300" style={{ textShadow: '0 0 20px #fbbf24' }}>★ NEW HIGH SCORE ★</div>}
            <div className="mt-2 font-display text-6xl font-black tabular-nums text-white" style={{ textShadow: '0 0 30px rgba(168,85,247,.8)' }}>{shown.toLocaleString()}</div>
            <div className="mt-1 text-sm text-white/50">FINAL SCORE</div>
          </div>

          {!outcome.award.valid && (
            <div className="mt-4 rounded-md border border-rose-500/50 bg-rose-500/10 p-3 text-sm text-rose-300">
              Round rejected by validation ({outcome.award.reason}). No rewards granted.
            </div>
          )}

          <div className="mt-5 flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg font-display text-4xl font-black" style={{ color: rating.color, border: `2px solid ${rating.color}`, boxShadow: `0 0 20px ${rating.color}66` }}>{rating.grade}</div>
            <div>
              <div className="font-display text-sm font-bold tracking-widest" style={{ color: rating.color }}>{rating.label}</div>
              <div className="text-sm text-white/60">Played as {char.name} on {mapById(usePlayer.getState().map).name}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="Coins" value={coins} sub={`${stats.rare} rare · ${stats.crystals} crystal`} />
            <Stat label="Survived" value={`${stats.survivalTime.toFixed(1)}s`} sub={stats.survived ? '+100 bonus' : 'no bonus'} />
            <Stat label="XP Earned" value={`+${outcome.award.xp}`} sub={`+${outcome.award.coins} arena coins`} />
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs font-semibold text-white/60">
              <span>LV {lvl.level} · {lvl.title.toUpperCase()}</span>
              <span>{xp - lvl.cur}/{lvl.next - lvl.cur} XP</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-neon-purple to-neon-green transition-all duration-1000" style={{ width: `${lvl.progress * 100}%` }} />
            </div>
            {outcome.leveledUp && (
              <div className="mt-3 animate-pop rounded-md border border-neon-green/60 bg-neon-green/10 p-2 text-center font-display text-sm font-bold text-neon-green">
                LEVEL UP! You are now level {outcome.newLevel}: {lvl.title}
              </div>
            )}
            {outcome.achievements.length > 0 && (
              <div className="mt-3 space-y-1">
                {outcome.achievements.map((id) => {
                  const a = ACHIEVEMENTS.find((x) => x.id === id)!;
                  return <div key={id} className="animate-rise rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-sm text-amber-200">🏆 Achievement: <b>{a.name}</b> (+{a.reward} coins)</div>;
                })}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button className="btn-primary flex-1" onClick={onReplay}>PLAY AGAIN</button>
            <button className="btn-ghost flex-1" onClick={() => { sound.play('click'); onExit(); }}>DASHBOARD</button>
            <button className="btn-ghost flex-1" onClick={() => { sound.play('click'); onLeaderboard(); }}>LEADERBOARD</button>
          </div>
          <p className="mt-3 text-center text-[11px] text-white/35">
            {outcome.source === 'server' ? 'Validated and saved by the DEGEN ARENA server.' : BACKEND_MODE === 'demo' ? 'Local demo mode: progress is saved in this browser only.' : 'Server unreachable: validated locally, saved in this browser.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-2">
      <div className="text-[10px] font-bold tracking-widest text-white/50">{label.toUpperCase()}</div>
      <div className="font-display text-xl font-black text-white">{value}</div>
      <div className="text-[10px] text-white/40">{sub}</div>
    </div>
  );
}

function Confetti() {
  const reduce = usePlayer((s) => s.settings.reducedMotion);
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 60 }, (_, i) => (
        <span
          key={i}
          className="confetti"
          style={{
            left: `${(i * 37) % 100}%`,
            background: ['#a855f7', '#39ff88', '#fbbf24', '#22d3ee', '#ff3ea5'][i % 5],
            animationDelay: `${(i % 12) * 0.12}s`,
            animationDuration: `${2.2 + (i % 5) * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}
