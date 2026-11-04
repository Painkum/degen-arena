// Original procedural SVG artwork: logo, character portraits, achievement badges, NFT-style previews.
import type { CharacterId, Palette } from '../data/characters';
import { charById } from '../data/characters';
import type { BadgeIcon } from '../data/achievements';

export function Logo({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg viewBox="0 0 64 64" className={compact ? 'h-9 w-9' : 'h-14 w-14'} aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a855f7" />
            <stop offset="1" stopColor="#39ff88" />
          </linearGradient>
          <filter id="lglow"><feGaussianBlur stdDeviation="1.6" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <path d="M32 4 56 17v30L32 60 8 47V17Z" fill="#0b0716" stroke="url(#lg)" strokeWidth="3" filter="url(#lglow)" />
        <path d="M21 19h11c8 0 13 5.5 13 13s-5 13-13 13H21Z" fill="url(#lg)" />
        <path d="M27 25h5c4.5 0 7 2.8 7 7s-2.5 7-7 7h-5Z" fill="#0b0716" />
        <circle cx="32" cy="32" r="2.5" fill="#39ff88" />
      </svg>
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-2xl font-black tracking-[0.18em] text-white sm:text-3xl">
            DEGEN<span className="bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent"> ARENA</span>
          </div>
          <div className="mt-1 font-body text-[10px] font-semibold tracking-[0.35em] text-white/50 sm:text-xs">FIGHT FOR GLORY · CLAIM YOUR RANK</div>
        </div>
      )}
      {compact && <div className="font-display text-lg font-black tracking-[0.15em]">DEGEN<span className="text-neon-green">ARENA</span></div>}
    </div>
  );
}

/** Chibi bust portrait drawn from the same palette as the 3D model. */
export function Portrait({ id, palette, size = 64, locked = false, className = '' }: { id: CharacterId; palette?: Palette; size?: number; locked?: boolean; className?: string }) {
  const p = palette ?? charById(id).palette;
  const gid = `pg-${id}-${size}`;
  const skin = id === 'warrior' ? '#e9e4dc' : '#f3c6a2';
  const eye = (x: number, glow = false) =>
    glow ? (
      <ellipse cx={x} cy="50" rx="5" ry="4" fill={p.visor} style={{ filter: `drop-shadow(0 0 3px ${p.visor})` }} />
    ) : (
      <g>
        <ellipse cx={x} cy="50" rx="6.5" ry="7.5" fill="#fff" />
        <ellipse cx={x} cy="51" rx="4.4" ry="5.4" fill={p.visor} />
        <circle cx={x} cy="51.5" r="2.3" fill="#111" />
        <circle cx={x - 1.6} cy="48.5" r="1.3" fill="#fff" />
      </g>
    );
  const brows = <><path d="M30 40 L44 44" stroke="#1a1a22" strokeWidth="3" strokeLinecap="round" /><path d="M70 40 L56 44" stroke="#1a1a22" strokeWidth="3" strokeLinecap="round" /></>;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-label={charById(id).name} role="img">
      <defs>
        <radialGradient id={gid} cx="50%" cy="40%" r="70%">
          <stop offset="0" stopColor={p.accent} stopOpacity=".55" />
          <stop offset="1" stopColor="#0b0820" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gid})`} />
      <g opacity={locked ? 0.22 : 1}>
        {/* shoulders / gi */}
        <path d="M16 100 Q18 80 34 76 L66 76 Q82 80 84 100Z" fill={id === 'assassin' ? p.suit : p.armor} />
        <path d="M42 76 L50 92 L58 76Z" fill={id === 'assassin' ? p.armor : p.suit} />
        {(id === 'warrior' || id === 'reaper') && <>
          <path d="M14 92 Q16 78 32 76 L30 90Z" fill={p.armor} stroke="#d9a520" strokeWidth="1.5" />
          <path d="M86 92 Q84 78 68 76 L70 90Z" fill={p.armor} stroke="#d9a520" strokeWidth="1.5" />
        </>}
        {id === 'rookie' && <path d="M60 76 L84 84 L80 94 L62 84Z" fill="#15151c" />}
        {/* head */}
        {id === 'rookie' && <>
          <path d="M18 62 Q14 14 50 10 Q86 14 82 62 Q82 76 50 78 Q18 76 18 62Z" fill={p.armor} />
          <path d="M50 4 L58 16 L42 16Z" fill={p.armor} />
          <ellipse cx="50" cy="52" rx="25" ry="23" fill={skin} />
          <path d="M25 54 Q50 50 75 54 L74 66 Q50 76 26 66Z" fill={p.accent} />
          <path d="M28 36 L58 28 L52 40 Z" fill="#6b6f7d" />
          {eye(40)}{eye(60)}
          <path d="M31 40 L45 44" stroke="#1a1a22" strokeWidth="3" strokeLinecap="round" /><path d="M69 40 L55 44" stroke="#1a1a22" strokeWidth="3" strokeLinecap="round" />
        </>}
        {id === 'warrior' && <>
          <path d="M30 26 L20 4 L36 22Z" fill="#15151c" /><circle cx="21" cy="6" r="2.5" fill={p.visor} />
          <path d="M70 26 L80 4 L64 22Z" fill="#15151c" /><circle cx="79" cy="6" r="2.5" fill={p.visor} />
          <ellipse cx="50" cy="48" rx="25" ry="27" fill={skin} />
          <path d="M25 44 Q26 20 50 20 Q74 20 75 44 Q62 34 50 34 Q38 34 25 44Z" fill="#15151c" />
          <path d="M47 30 L53 30 L50 36Z" fill={p.visor} />
          {eye(40, true)}{eye(60, true)}{brows}
          <path d="M44 66 L56 66" stroke="#2a1a1a" strokeWidth="2" />
        </>}
        {id === 'assassin' && <>
          <circle cx="50" cy="16" r="8" fill={p.hair} />
          <path d="M46 12 L36 0 L50 8Z" fill={p.hair} /><path d="M54 12 L66 2 L52 8Z" fill={p.hair} />
          <ellipse cx="50" cy="50" rx="26" ry="25" fill={skin} />
          <path d="M24 50 Q22 20 50 20 Q78 20 76 50 Q70 34 50 32 Q30 34 24 50Z" fill={p.hair} />
          <rect x="22" y="44" width="6" height="22" rx="3" fill={p.hair} /><rect x="72" y="44" width="6" height="22" rx="3" fill={p.hair} />
          <path d="M50 36 L47 42 L53 42Z" fill={p.hair} />
          {eye(40)}{eye(60)}
          <path d="M31 40 L45 44" stroke={p.hair} strokeWidth="3.5" strokeLinecap="round" /><path d="M69 40 L55 44" stroke={p.hair} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M47 64 L53 64" stroke="#7a4a3a" strokeWidth="2" strokeLinecap="round" />
        </>}
        {id === 'reaper' && <>
          <path d="M20 46 Q20 14 50 12 Q80 14 80 46 L88 50 L12 50Z" fill={p.armor} />
          <path d="M32 18 Q50 -6 68 18" fill="none" stroke="#d9a520" strokeWidth="4" />
          <ellipse cx="50" cy="56" rx="24" ry="20" fill="#15151c" />
          <path d="M26 58 Q50 54 74 58 L72 72 Q50 80 28 72Z" fill={p.armor} />
          <path d="M44 66 L56 66" stroke="#d9a520" strokeWidth="2" />
          {eye(40, true)}{eye(60, true)}
        </>}
        {id === 'guardian' && <>
          <ellipse cx="50" cy="50" rx="26" ry="25" fill={skin} />
          <path d="M24 46 Q24 20 50 20 Q76 20 76 46 Q64 34 50 34 Q36 34 24 46Z" fill={p.suit} />
          <rect x="24" y="34" width="52" height="6" fill={p.accent} />
          {eye(40)}{eye(60)}{brows}
        </>}
      </g>
      {locked && (
        <g>
          <rect x="38" y="42" width="24" height="20" rx="3" fill="#0b0716" stroke="#64748b" strokeWidth="2" />
          <path d="M43 42 v-6 a7 7 0 0 1 14 0 v6" fill="none" stroke="#64748b" strokeWidth="3" />
        </g>
      )}
    </svg>
  );
}

const ICONS: Record<BadgeIcon, string> = {
  bolt: 'M54 14 30 54h16l-6 32 26-44H50Z',
  coin: 'M50 22a28 28 0 1 0 .01 0ZM50 32a18 18 0 1 1-.01 0Z M44 40h8c6 0 9 4 9 10s-3 10-9 10h-8Z',
  shield: 'M50 16 76 26v20c0 18-12 30-26 38-14-8-26-20-26-38V26Z',
  crown: 'M22 66 26 32 40 48 50 26 60 48 74 32 78 66Z',
  gem: 'M30 36 40 22h20l10 14-20 40Z',
  flame: 'M50 14c4 14 22 22 22 42a22 22 0 0 1-44 0c0-10 6-16 10-20 0 8 4 12 8 12-4-14 2-26 4-34Z',
  star: 'M50 16 59 40h25L64 55l8 25-22-15-22 15 8-25-20-15h25Z',
  skull: 'M50 18c-16 0-26 11-26 26 0 9 4 15 10 18v12h32V62c6-3 10-9 10-18 0-15-10-26-26-26ZM40 40a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm20 0a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z',
};

export function BadgeArt({ icon, color, earned, size = 72 }: { icon: BadgeIcon; color: string; earned: boolean; size?: number }) {
  const c = earned ? color : '#3f3a52';
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <path d="M50 4 90 27v46L50 96 10 73V27Z" fill="#0b0716" stroke={c} strokeWidth="4" />
      <path d="M50 14 81 32v36L50 86 19 68V32Z" fill={c} fillOpacity={earned ? 0.15 : 0.05} />
      <path d={ICONS[icon]} fill={c} fillRule="evenodd" transform="translate(10 8) scale(.8)" />
      {earned && <circle cx="80" cy="20" r="6" fill="#39ff88" />}
    </svg>
  );
}

/** NFT-inspired collectible card preview (not minted, purely cosmetic artwork). */
export function CollectibleArt({ seed, color, size = 120 }: { seed: number; color: string; size?: number }) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 + seed;
    const r = 26 + ((seed * 7 + i * 13) % 12);
    return `${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <defs>
        <radialGradient id={`cg${seed}`}><stop offset="0" stopColor={color} stopOpacity=".6" /><stop offset="1" stopColor="#05030c" /></radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#cg${seed})`} />
      <polygon points={pts} fill="none" stroke={color} strokeWidth="2" />
      <polygon points={pts} fill={color} fillOpacity=".12" transform="rotate(30 50 50) scale(.6) translate(33 33)" />
      <circle cx="50" cy="50" r="8" fill={color} />
      {[0, 1, 2].map((i) => <circle key={i} cx="50" cy="50" r={14 + i * 12} fill="none" stroke={color} strokeOpacity={0.3 - i * 0.08} />)}
    </svg>
  );
}
