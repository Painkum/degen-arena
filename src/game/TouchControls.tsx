import { useEffect, useRef, useState } from 'react';
import { input, queueDash, queueJump } from './input';
import { useRound } from './world';

/** Left-side floating joystick + right-side dash button. Shown on touch devices. */
export function TouchControls() {
  const zone = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState<{ bx: number; by: number; kx: number; ky: number } | null>(null);
  const dashReady = useRound((s) => s.dashReady);

  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    let id: number | null = null;
    let bx = 0, by = 0;
    const R = 56;
    const down = (e: PointerEvent) => {
      if (id !== null) return;
      id = e.pointerId;
      el.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect();
      bx = e.clientX - r.left;
      by = e.clientY - r.top;
      input.joy.active = true;
      setKnob({ bx, by, kx: 0, ky: 0 });
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const r = el.getBoundingClientRect();
      let dx = e.clientX - r.left - bx;
      let dy = e.clientY - r.top - by;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
      input.joy.x = dx / R;
      input.joy.y = -dy / R;
      setKnob({ bx, by, kx: dx, ky: dy });
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      input.joy.active = false;
      input.joy.x = input.joy.y = 0;
      setKnob(null);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, []);

  return (
    <>
      <div ref={zone} className="pointer-events-auto absolute bottom-0 left-0 h-[45%] w-[48%] touch-none" aria-label="Movement joystick area">
        {!knob && (
          <div className="absolute bottom-[calc(28px+env(safe-area-inset-bottom))] left-7 h-28 w-28 rounded-full border-2 border-neon-purple/40 bg-neon-purple/5">
            <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-neon-purple/60 bg-neon-purple/20" />
            <span className="absolute -top-6 left-0 w-full text-center text-[10px] font-display tracking-widest text-white/50">MOVE</span>
          </div>
        )}
        {knob && (
          <div className="absolute h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-neon-purple/70 bg-neon-purple/10 shadow-neon" style={{ left: knob.bx, top: knob.by }}>
            <div
              className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-gradient-to-br from-neon-purple to-neon-green shadow-green"
              style={{ transform: `translate(calc(-50% + ${knob.kx}px), calc(-50% + ${knob.ky}px))` }}
            />
          </div>
        )}
      </div>
      {/* JUMP: big primary button */}
      <button
        className="pointer-events-auto absolute bottom-[calc(24px+env(safe-area-inset-bottom))] right-5 grid h-[88px] w-[88px] touch-none place-items-center rounded-full border-2 border-neon-purple bg-gradient-to-b from-neon-purple/40 to-black/60 font-display text-xs font-bold tracking-widest text-white shadow-neon backdrop-blur active:scale-90"
        onPointerDown={(e) => { e.preventDefault(); queueJump(); }}
        aria-label="Jump"
      >
        <span className="flex flex-col items-center leading-none">
          <svg viewBox="0 0 24 24" className="mb-1 h-6 w-6" fill="currentColor" aria-hidden><path d="M12 4 4 13h5v7h6v-7h5Z" /></svg>
          JUMP
        </span>
      </button>
      {/* DASH: smaller, with cooldown ring */}
      <button
        className="pointer-events-auto absolute bottom-[calc(118px+env(safe-area-inset-bottom))] right-[86px] grid h-[70px] w-[70px] touch-none place-items-center rounded-full border border-neon-green/60 bg-black/50 font-display text-[10px] font-bold tracking-widest text-neon-green shadow-green backdrop-blur active:scale-90"
        onPointerDown={(e) => { e.preventDefault(); queueDash(); }}
        aria-label="Dash"
      >
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(57,255,136,.15)" strokeWidth="7" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="#39ff88" strokeWidth="7" strokeDasharray={283} strokeDashoffset={283 * (1 - dashReady)} strokeLinecap="round" />
        </svg>
        DASH
      </button>
    </>
  );
}
