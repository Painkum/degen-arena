import { useEffect, useState } from 'react';
import { Logo } from './Art';

const TIPS = [
  'Dashing makes you phase through lasers and energy walls.',
  'Double jump (Space twice) clears lasers and spinning hammers.',
  'Spinning hammers still hit you mid-dash. Go around them.',
  'Red circles explode. Get out before the fuse runs out.',
  'Energy crystals are worth 50 points but vanish quickly.',
  'Dash into a rival degen to knock them away.',
];

export function LoadingScreen({ onDone, label = 'BOOTING ARENA' }: { onDone?: () => void; label?: string }) {
  const [p, setP] = useState(0);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  useEffect(() => {
    if (!onDone) return;
    let v = 0;
    const id = setInterval(() => {
      v = Math.min(100, v + 6 + Math.random() * 14);
      setP(v);
      if (v >= 100) { clearInterval(id); setTimeout(onDone, 250); }
    }, 90);
    return () => clearInterval(id);
  }, [onDone]);
  return (
    <div className="scanlines fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-void p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(124,58,237,.35),transparent_55%)]" />
      <div className="absolute bottom-0 left-1/2 h-[40vh] w-[160vw] -translate-x-1/2 [transform:perspective(400px)_rotateX(60deg)] bg-[linear-gradient(rgba(168,85,247,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,.35)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
      <div className="relative animate-rise">
        <Logo />
      </div>
      <div className="relative mt-10 w-full max-w-xs">
        <div className="mb-2 flex justify-between font-display text-[10px] tracking-[0.3em] text-white/60">
          <span>{label}</span>
          {onDone && <span>{Math.floor(p)}%</span>}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full bg-gradient-to-r from-neon-purple to-neon-green ${onDone ? '' : 'w-1/2 animate-pulseglow'}`} style={onDone ? { width: `${p}%` } : undefined} />
        </div>
        <p className="mt-6 text-center text-sm text-white/50">TIP: {tip}</p>
      </div>
    </div>
  );
}
