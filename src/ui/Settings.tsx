import { usePlayer, type Quality } from '../store/playerStore';
import { sound } from '../audio/sound';
import { useCustomTrack, useSongFile, removeSongFile } from '../audio/customTrack';

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1.5">
      <span className="text-sm font-semibold text-white/80">{label}</span>
      <button
        role="switch"
        aria-checked={on}
        onClick={() => { onChange(!on); sound.play('click'); }}
        className={`relative h-6 w-11 rounded-full border transition ${on ? 'border-neon-green bg-neon-green/30' : 'border-white/20 bg-white/5'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${on ? 'left-6 bg-neon-green shadow-green' : 'left-1 bg-white/50'}`} />
      </button>
    </label>
  );
}

function Soundtrack() {
  const { name, error } = useCustomTrack();
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-white/80">Soundtrack</span>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer rounded-md border border-white/20 px-2.5 py-1 font-display text-[10px] tracking-widest text-white/80 hover:border-neon-purple">
            {name ? 'CHANGE' : 'USE MY SONG'}
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) useSongFile(f); e.target.value = ''; }}
            />
          </label>
          {name && (
            <button className="rounded-md border border-white/20 px-2.5 py-1 font-display text-[10px] tracking-widest text-white/60 hover:border-rose-400" onClick={() => removeSongFile()}>
              BUILT-IN
            </button>
          )}
        </div>
      </div>
      <div className="mt-0.5 truncate text-[11px] text-white/45">
        {name ? <>Playing your file: <span className="text-neon-green">{name}</span></> : 'Built-in track: Degen Rush'}
      </div>
      {error && <div className="text-[11px] text-rose-300">{error}</div>}
      <div className="text-[10px] text-white/30">Your file plays from this device only. It isn't uploaded.</div>
    </div>
  );
}

export function Settings({ compact = false }: { compact?: boolean }) {
  const s = usePlayer((x) => x.settings);
  const set = usePlayer((x) => x.setSettings);
  return (
    <div className={compact ? '' : 'space-y-1'}>
      <Toggle label="Music" on={s.music} onChange={(v) => set({ music: v })} />
      <Soundtrack />
      <Toggle label="Sound effects" on={s.sfx} onChange={(v) => set({ sfx: v })} />
      <Toggle label="Reduced motion" on={s.reducedMotion} onChange={(v) => set({ reducedMotion: v })} />
      <div className="flex items-center justify-between gap-4 py-1.5">
        <span className="text-sm font-semibold text-white/80">Graphics quality</span>
        <div className="flex overflow-hidden rounded-md border border-white/20">
          {(['low', 'medium', 'high'] as Quality[]).map((q) => (
            <button
              key={q}
              onClick={() => { set({ quality: q }); sound.play('click'); }}
              className={`px-2.5 py-1 font-display text-[10px] tracking-widest ${s.quality === q ? 'bg-neon-purple text-white' : 'text-white/60 hover:bg-white/10'}`}
            >
              {q.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
