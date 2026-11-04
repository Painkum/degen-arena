import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Dashboard, type Tab } from './ui/Dashboard';
import { LoadingScreen } from './ui/LoadingScreen';
import { Toasts } from './ui/Toasts';
import { usePlayer, useToasts } from './store/playerStore';
import { levelFromXp, LEVEL_REWARDS } from './data/levels';
import { sound } from './audio/sound';
import { restoreCustomTrack } from './audio/customTrack';

// The game bundle (three.js scene) loads only when needed.
const GameScreen = lazy(() => import('./game/GameScreen').then((m) => ({ default: m.GameScreen })));

export default function App() {
  const [booted, setBooted] = useState(false);
  const [screen, setScreen] = useState<'dashboard' | 'game'>('dashboard');
  const [tab, setTab] = useState<Tab>('home');
  const settings = usePlayer((s) => s.settings);
  const xp = usePlayer((s) => s.xp);
  const rollPeriods = usePlayer((s) => s.rollPeriods);
  const lastLevel = useRef(levelFromXp(xp).level);
  const [levelUp, setLevelUp] = useState<number | null>(null);

  useEffect(() => { rollPeriods(); }, [rollPeriods]);
  useEffect(() => { restoreCustomTrack(); }, []);
  useEffect(() => { sound.setMusic(settings.music); sound.setSfx(settings.sfx); }, [settings.music, settings.sfx]);
  useEffect(() => { sound.setTrack(settings.track ?? 'overdrive'); }, [settings.track]);
  useEffect(() => { document.documentElement.classList.toggle('reduce-motion', settings.reducedMotion); }, [settings.reducedMotion]);

  // Level-up celebration (shown when back on the dashboard, or immediately if already there)
  useEffect(() => {
    const lvl = levelFromXp(xp).level;
    if (lvl > lastLevel.current) {
      setLevelUp(lvl);
      if (screen === 'dashboard') sound.play('levelup');
    }
    lastLevel.current = lvl;
  }, [xp, screen]);

  // first user gesture unlocks audio (browser autoplay rules)
  useEffect(() => {
    const unlock = () => { sound.unlock(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  }, []);

  if (!booted) return <LoadingScreen onDone={() => setBooted(true)} />;

  return (
    <>
      {screen === 'dashboard' && (
        <Dashboard tab={tab} setTab={setTab} onPlay={() => { sound.unlock(); setScreen('game'); }} />
      )}
      {screen === 'game' && (
        <Suspense fallback={<LoadingScreen label="LOADING ARENA" />}>
          <GameScreen
            onExit={() => { setTab('home'); setScreen('dashboard'); }}
            onLeaderboard={() => { setTab('leaderboard'); setScreen('dashboard'); }}
          />
        </Suspense>
      )}
      {levelUp && screen === 'dashboard' && <LevelUpModal level={levelUp} onClose={() => setLevelUp(null)} />}
      <Toasts />
    </>
  );
}

function LevelUpModal({ level, onClose }: { level: number; onClose: () => void }) {
  const info = levelFromXp(usePlayer.getState().xp);
  const push = useToasts((s) => s.push);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="panel-glow w-full max-w-sm animate-pop overflow-hidden p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="pointer-events-none absolute inset-0 animate-pulseglow bg-[radial-gradient(circle_at_50%_30%,rgba(57,255,136,.25),transparent_60%)]" />
        <div className="relative">
          <div className="font-display text-xs tracking-[0.4em] text-neon-green">LEVEL UP</div>
          <div className="mx-auto mt-3 grid h-28 w-28 place-items-center rounded-full border-4 border-neon-green font-display text-5xl font-black text-white shadow-green">{level}</div>
          <div className="mt-3 font-display text-xl font-black tracking-widest">{info.title.toUpperCase()}</div>
          {LEVEL_REWARDS[level] && <div className="mt-2 text-neon-green">Reward: {LEVEL_REWARDS[level]}</div>}
          <button className="btn-primary mt-6 w-full" onClick={() => { push({ title: `Level ${level} reached`, tone: 'good' }); onClose(); }}>NICE</button>
        </div>
      </div>
    </div>
  );
}
