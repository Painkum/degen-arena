import { useToasts } from '../store/playerStore';

export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  const drop = useToasts((s) => s.drop);
  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[60] flex w-[min(320px,calc(100vw-24px))] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => drop(t.id)}
          className={`pointer-events-auto animate-rise rounded-lg border bg-panel/95 px-4 py-3 text-left shadow-lg backdrop-blur ${
            t.tone === 'good' ? 'border-neon-green/60' : t.tone === 'bad' ? 'border-rose-500/60' : 'border-neon-purple/60'
          }`}
        >
          <div className={`font-display text-xs font-bold tracking-widest ${t.tone === 'good' ? 'text-neon-green' : t.tone === 'bad' ? 'text-rose-400' : 'text-neon-purple'}`}>{t.title}</div>
          {t.body && <div className="mt-0.5 text-sm text-white/70">{t.body}</div>}
        </button>
      ))}
    </div>
  );
}
