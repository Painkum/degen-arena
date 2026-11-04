import { lazy, Suspense } from 'react';
import { usePlayer } from '../../store/playerStore';
import { charById } from '../../data/characters';
import { POINTS, ROUND_SECONDS } from '../../lib/rules';
import { MAPS, mapById, type MapId } from '../../data/maps';
import { sound } from '../../audio/sound';

const ArenaPreview = lazy(() => import('../Showcase').then((m) => ({ default: m.ArenaPreview })));

/** Small original illustration of each map for the picker cards. */
function MapThumb({ id }: { id: MapId }) {
  const [a, b] = mapById(id).colors;
  return (
    <svg viewBox="0 0 160 90" className="h-auto w-full" aria-hidden>
      <defs>
        <linearGradient id={`mt-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={id === 'grove' ? '#04201f' : id === 'harbor' ? '#12051c' : '#1e1050'} />
          <stop offset="1" stopColor={a} />
        </linearGradient>
      </defs>
      <rect width="160" height="90" fill={`url(#mt-${id})`} />
      {[12, 40, 70, 110, 140, 25, 95, 128].map((x, i) => <circle key={i} cx={x} cy={8 + ((i * 17) % 30)} r={i % 3 ? 0.8 : 1.3} fill="#fff" opacity=".8" />)}
      {id === 'station' && <>
        <circle cx="128" cy="20" r="11" fill="#dfe9ff" />
        <rect x="78" y="0" width="4" height="56" fill="#ffd23f" opacity=".85" />
        <ellipse cx="80" cy="62" rx="58" ry="14" fill="#c9c3e3" stroke="#2f4fd1" strokeWidth="4" />
        <ellipse cx="80" cy="62" rx="42" ry="9" fill="none" stroke={b} strokeWidth="2" />
        <path d="M70 58 L80 46 L90 58 Z" fill="#9ef0ff" />
        <ellipse cx="22" cy="80" rx="12" ry="4" fill="#5fbf4a" /><path d="M10 80 L22 92 L34 80Z" fill="#7a5a8a" />
      </>}
      {id === 'grove' && <>
        <ellipse cx="80" cy="64" rx="56" ry="13" fill="#4a7f3a" />
        <path d="M24 64 L80 92 L136 64Z" fill="#8b5a3c" />
        <ellipse cx="80" cy="64" rx="36" ry="8" fill="none" stroke="#5ff2e0" strokeWidth="1.5" />
        <path d="M74 60 L80 40 L86 60Z" fill={b} />
        {[[26, 52], [130, 50], [112, 40]].map(([x, y], i) => <g key={i}><rect x={x - 1.5} y={y} width="3" height="12" fill="#bdf3ff" /><path d={`M${x - 10} ${y} Q${x} ${y - 12} ${x + 10} ${y}Z`} fill="#4f7dff" /></g>)}
        <path d="M44 14 L58 14 L51 30Z" fill="#8b5a3c" /><rect x="54" y="20" width="3" height="40" fill="#2f6fe0" opacity=".8" />
      </>}
      {id === 'harbor' && <>
        <rect y="58" width="160" height="32" fill="#7a1a8a" />
        {[10, 35, 60, 100, 125, 150].map((x, i) => <circle key={i} cx={x} cy={68 + (i % 3) * 6} r="1" fill="#fff" />)}
        <circle cx="128" cy="18" r="10" fill="#e8c9e0" /><ellipse cx="128" cy="18" rx="18" ry="4" fill="none" stroke="#c88ab8" strokeWidth="2" />
        <rect x="4" y="36" width="40" height="22" fill="#5fb3a8" /><rect x="4" y="34" width="36" height="3" fill="#e7d8b8" />
        <ellipse cx="88" cy="62" rx="40" ry="9" fill="#3a3d52" stroke="#e7d8b8" strokeWidth="3" />
        <rect x="83" y="44" width="10" height="16" fill={b} opacity=".5" />
        <circle cx="140" cy="54" r="12" fill="none" stroke="#e05ca8" strokeWidth="4" />
      </>}
    </svg>
  );
}

function MapPicker() {
  const map = usePlayer((s) => s.map);
  const setMap = usePlayer((s) => s.setMap);
  return (
    <section className="panel p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-bold tracking-[0.2em] text-white">SELECT MAP</h3>
        <span className="text-xs text-white/50">Same rules on every map</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {MAPS.map((m) => (
          <button
            key={m.id}
            onClick={() => { setMap(m.id); sound.play('click'); }}
            className={`char-tile text-left ${map === m.id ? 'selected' : ''}`}
            aria-pressed={map === m.id}
          >
            <MapThumb id={m.id} />
            {map === m.id && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-[10px] font-black text-black">✓</span>}
            <div className="p-3">
              <div className="font-display text-xs font-bold tracking-widest">{m.name.toUpperCase()}</div>
              <div className="text-[11px] font-semibold" style={{ color: m.colors[1] }}>{m.tagline}</div>
              <div className="mt-1 text-[11px] text-white/50">{m.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

const HAZARDS = [
  { n: 'Rotating lasers', d: 'Sweep the arena from the core. Jump over or dash through.', c: '#ff2e7e' },
  { n: 'Energy walls', d: 'Slide in and out across the platform.', c: '#39ff88' },
  { n: 'Shock pads', d: 'Yellow = warning, cyan = live. Jump to stay off the floor.', c: '#22d3ee' },
  { n: 'Spin hammers', d: 'Heavy rotors. Dashing will not save you, jumping will.', c: '#f97316' },
  { n: 'Blast zones', d: 'Red circles detonate after a short fuse.', c: '#f43f5e' },
  { n: 'Rival degens', d: 'AI bots steal coins and sometimes charge you.', c: '#a855f7' },
];

export function PlaySection({ onPlay }: { onPlay: () => void }) {
  const p = usePlayer();
  const c = charById(p.equipped.character);
  return (
    <div className="space-y-6">
      <section className="panel-glow relative overflow-hidden">
        <div className="relative h-[52vh] min-h-[320px]">
          <Suspense fallback={<div className="grid h-full place-items-center text-white/40">Loading arena preview…</div>}>
            <ArenaPreview quality={p.settings.quality} hero={p.equipped.character} map={p.map} />
          </Suspense>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-8">
            <div>
              <div className="chip border-neon-green/50 bg-black/40 text-neon-green">GAME MODE</div>
              <h2 className="mt-2 font-display text-3xl font-black tracking-wider sm:text-4xl">COIN SURVIVAL</h2>
              <p className="text-white/70">{ROUND_SECONDS}s · 100 HP · <b className="text-white">{c.name}</b> on <b className="text-white">{mapById(p.map).name}</b></p>
            </div>
            <button className="btn-primary px-10 py-4 text-base" onClick={onPlay}>▶ PLAY NOW</button>
          </div>
        </div>
      </section>

      <MapPicker />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5">
          <h3 className="font-display text-sm font-bold tracking-widest text-neon-green">SCORING</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between"><span><span className="text-neon-green">●</span> Energy coin</span><b>{POINTS.normal}</b></li>
            <li className="flex justify-between"><span><span className="text-neon-purple">●</span> Rare energy coin</span><b>{POINTS.rare}</b></li>
            <li className="flex justify-between"><span><span className="text-cyan-300">◆</span> Energy crystal</span><b>{POINTS.crystal}</b></li>
            <li className="flex justify-between"><span><span className="text-amber-300">★</span> Survive full round</span><b>{POINTS.survival}</b></li>
          </ul>
          <h3 className="mt-5 font-display text-sm font-bold tracking-widest text-neon-green">BOOSTERS</h3>
          <ul className="mt-2 space-y-1 text-sm text-white/70">
            <li><b className="text-amber-300">Speed</b> · move 45% faster for 6s</li>
            <li><b className="text-cyan-300">Shield</b> · blocks the next hit</li>
            <li><b className="text-pink-400">Magnet</b> · pulls nearby coins for 7s</li>
            <li><b className="text-neon-green">Repair</b> · restores 30 HP</li>
          </ul>
        </div>
        <div className="panel p-5 lg:col-span-2">
          <h3 className="font-display text-sm font-bold tracking-widest text-rose-400">HAZARDS · difficulty rises every second</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {HAZARDS.map((h) => (
              <div key={h.n} className="flex gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ background: h.c, boxShadow: `0 0 10px ${h.c}` }} />
                <div><div className="text-sm font-bold">{h.n}</div><div className="text-xs text-white/55">{h.d}</div></div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2 text-sm text-white/60 sm:grid-cols-2">
            <div><b className="text-white">Desktop:</b> WASD move · Space jump (double jump) · Shift dash · drag mouse to orbit camera · Q/E rotate · wheel zoom · Esc pause</div>
            <div><b className="text-white">Mobile:</b> left thumb joystick · JUMP and DASH buttons on the right · drag right side to turn camera</div>
          </div>
        </div>
      </section>
    </div>
  );
}
