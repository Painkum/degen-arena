import { useEffect } from 'react';
import { usePlayer, useToasts } from '../../store/playerStore';
import { MISSIONS, type MissionDef } from '../../data/missions';
import { sound } from '../../audio/sound';

function timeUntil(target: Date) {
  const ms = target.getTime() - Date.now();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${m}m`;
}

function MissionCard({ m }: { m: MissionDef }) {
  const p = usePlayer();
  const push = useToasts((s) => s.push);
  const per = m.period === 'daily' ? p.daily : p.weekly;
  const raw = per.c[m.stat];
  const v = Math.min(m.target, raw);
  const done = raw >= m.target;
  const claimed = p.claimed.includes(`${per.key}:${m.id}`);
  const fmt = (n: number) => (m.stat === 'playSeconds' ? `${Math.floor(n / 60)}m` : m.stat === 'bestSurvival' ? `${n}s` : n.toLocaleString());

  return (
    <div className={`panel p-4 ${done && !claimed ? 'ring-1 ring-neon-green/70' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-sm font-bold tracking-wider">{m.title.toUpperCase()}</div>
          <div className="text-sm text-white/60">{m.desc}</div>
        </div>
        <div className="shrink-0 text-right text-xs font-bold">
          <div className="text-neon-green">+Ð {m.reward.coins}</div>
          <div className="text-neon-purple">+{m.reward.xp} XP</div>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${done ? 'bg-neon-green shadow-green' : 'bg-neon-purple'}`} style={{ width: `${(v / m.target) * 100}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-white/50">{fmt(v)} / {fmt(m.target)}</span>
        <button
          className={claimed ? 'btn-ghost py-1.5' : 'btn-primary py-1.5 text-xs'}
          disabled={!done || claimed}
          onClick={() => {
            const r = p.claimMission(m.id);
            push({ title: r.ok ? 'REWARD CLAIMED' : 'CANNOT CLAIM', body: r.message, tone: r.ok ? 'good' : 'bad' });
            sound.play(r.ok ? 'boost' : 'click');
          }}
        >
          {claimed ? '✓ CLAIMED' : done ? 'CLAIM' : 'IN PROGRESS'}
        </button>
      </div>
    </div>
  );
}

export function MissionsSection() {
  const roll = usePlayer((s) => s.rollPeriods);
  useEffect(() => { roll(); }, [roll]);
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const nextMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((8 - (now.getDay() || 7)) % 7 || 7));

  return (
    <div className="space-y-6">
      <h1 className="section-title">MISSIONS</h1>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold tracking-[0.2em] text-neon-green">DAILY</h2>
          <span className="text-xs text-white/50">Resets in {timeUntil(tomorrow)}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{MISSIONS.filter((m) => m.period === 'daily').map((m) => <MissionCard key={m.id} m={m} />)}</div>
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold tracking-[0.2em] text-neon-purple">WEEKLY CHALLENGES</h2>
          <span className="text-xs text-white/50">Resets in {timeUntil(nextMonday)}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">{MISSIONS.filter((m) => m.period === 'weekly').map((m) => <MissionCard key={m.id} m={m} />)}</div>
      </section>
    </div>
  );
}
