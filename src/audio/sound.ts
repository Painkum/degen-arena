// All audio is synthesized at runtime with the Web Audio API — no copyrighted music or samples.

type Sfx = 'coin' | 'rare' | 'crystal' | 'dash' | 'hit' | 'damage' | 'levelup' | 'victory' | 'gameover' | 'boost' | 'jump' | 'click' | 'countdown' | 'go';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private sfxGain!: GainNode;
  private musicOn = true;
  private sfxOn = true;
  private musicTimer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private intensity = 0; // 0 = menu, 1 = in-game
  // Optional player-supplied soundtrack (a local file; never uploaded).
  private customEl: HTMLAudioElement | null = null;
  private customNode: MediaElementAudioSourceNode | null = null;
  private customUrl: string | null = null;

  private ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicOn ? 0.24 : 0;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxOn ? 0.55 : 0;
    this.sfxGain.connect(this.master);
    return this.ctx;
  }

  /** Must be called from a user gesture on iOS/Safari. */
  unlock() {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (this.musicOn) this.startMusic();
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    if (this.ctx) {
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.setTargetAtTime(on ? 0.24 : 0, this.ctx.currentTime, 0.1);
    }
    if (on && this.ctx) this.startMusic();
    if (!on) this.customEl?.pause();
  }

  /** Use a song file from the player's device instead of the built-in track. Pass null to go back. */
  setCustomTrack(file: Blob | null) {
    this.customEl?.pause();
    this.customNode?.disconnect();
    if (this.customUrl) URL.revokeObjectURL(this.customUrl);
    this.customEl = null;
    this.customNode = null;
    this.customUrl = null;
    if (file) {
      this.customUrl = URL.createObjectURL(file);
      const el = new Audio(this.customUrl);
      el.loop = true;
      this.customEl = el;
    }
    this.stopScheduler();
    if (this.ctx && this.musicOn) this.startMusic();
  }

  get hasCustomTrack() { return this.customEl !== null; }

  private stopScheduler() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
  setSfx(on: boolean) {
    this.sfxOn = on;
    if (this.ctx) this.sfxGain.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.05);
  }
  setIntensity(v: number) { this.intensity = v; }

  private startMusic() {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.customEl) {
      // Finished songs are already mastered loud, so they get their own level.
      // The Music toggle pauses the element (see setMusic).
      if (!this.customNode) {
        this.customNode = ctx.createMediaElementSource(this.customEl);
        const level = ctx.createGain();
        level.gain.value = 0.55;
        this.customNode.connect(level).connect(this.master);
      }
      this.customEl.play().catch(() => {}); // needs a user gesture; unlock() retries
      return;
    }
    if (this.musicTimer !== null) return;
    this.nextTime = ctx.currentTime + 0.1;
    this.musicTimer = window.setInterval(() => this.schedule(), 50);
  }

  // "Degen Rush": original high-energy ninja track in the Japanese In scale (D Eb G A Bb).
  // Four-on-the-floor kick, claps, 16th hi-hats, a pumping bass, rapid koto arps,
  // a bamboo-flute hook and taiko fills. Menu runs at 128 BPM, in-game at 150 BPM
  // with extra layers. Fully synthesized, no samples.
  private schedule() {
    const ctx = this.ctx!;
    const game = this.intensity > 0.5;
    const bpm = game ? 150 : 128;
    const six = 60 / bpm / 4;
    const S = [50, 51, 55, 57, 58, 62, 63, 67, 69, 70, 74, 75, 79];
    const roots = [50, 46, 48, 45]; // D, Bb, C, A
    // flute hook per bar: [step, scale index, length]
    const hook: [number, number, number][][] = [
      [[0, 9, 2], [2, 9, 1], [3, 10, 1], [4, 9, 2], [6, 7, 2], [8, 8, 3], [11, 7, 1], [12, 5, 4]],
      [[0, 7, 2], [2, 8, 2], [4, 9, 2], [6, 10, 2], [8, 12, 4], [12, 10, 2], [14, 9, 2]],
      [[0, 8, 2], [2, 7, 1], [3, 8, 1], [4, 9, 4], [8, 7, 2], [10, 6, 2], [12, 7, 4]],
      [[0, 9, 1], [1, 10, 1], [2, 9, 2], [4, 7, 2], [6, 5, 2], [8, 6, 2], [10, 7, 2], [12, 5, 4]],
    ];
    const arp = [0, 2, 4, 7, 4, 2, 5, 4];
    const bassPat = [0, 0, 12, 0, 0, 12, 0, 7]; // per 8th note, semitones above root
    while (this.nextTime < ctx.currentTime + 0.25) {
      const s = this.step % 64;
      const bar = Math.floor(s / 16);
      const pos = s % 16;
      const t = this.nextTime;
      const root = roots[bar];
      const rootIdx = Math.max(0, S.findIndex((n) => n % 12 === root % 12));
      const phrase = Math.floor(this.step / 64) % 2; // alternate 4-bar phrases: build / full

      // drums
      if (pos % 4 === 0) this.kick(t, 0.5);
      if (pos === 4 || pos === 12) this.clap(t, game ? 0.22 : 0.18);
      this.noise(t, pos % 4 === 2 ? 0.08 : 0.03, pos % 4 === 2 ? 0.06 : (game ? 0.035 : 0.02), 8000, this.musicGain); // hats
      if (bar === 3 && pos >= 8) this.taiko(t, 0.18 + (pos - 8) * 0.04, 90 + (pos - 8) * 8); // taiko fill into the loop
      if (game && (pos === 0 || pos === 10)) this.taiko(t, 0.35, 60);

      // pumping bass on 8th notes
      if (pos % 2 === 0) {
        const n = root - 12 + bassPat[(pos >> 1) % bassPat.length];
        this.tone(n, t, six * 1.7, 'sawtooth', 0.11, this.musicGain, 700);
        this.tone(n - 12, t, six * 1.7, 'sine', 0.14, this.musicGain, 300);
      }
      // power-stab chord on the bar downbeat
      if (pos === 0) [0, 7, 12].forEach((iv) => this.tone(root + iv, t, six * 3, 'sawtooth', 0.035, this.musicGain, 2500));

      // rapid koto arps (16ths)
      const k = arp[pos % arp.length];
      this.pluck(S[Math.min(S.length - 1, rootIdx + k)] + (pos >= 8 && phrase ? 12 : 0), t, game ? 0.06 : 0.05);

      // flute hook (second phrase of every 8 bars in the menu, always in-game)
      if (game || phrase === 1) {
        for (const [st, idx, len] of hook[bar]) if (st === pos) this.flute(S[idx] + 12, t, six * len * 0.9, 0.055);
      }
      this.nextTime += six;
      this.step++;
    }
  }

  private kick(t: number, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(this.musicGain);
    o.start(t);
    o.stop(t + 0.3);
    // duck the music bus a little for a pumping feel
    this.musicGain.gain.setTargetAtTime(this.musicOn ? 0.15 : 0, t, 0.01);
    this.musicGain.gain.setTargetAtTime(this.musicOn ? 0.24 : 0, t + 0.06, 0.06);
  }

  private clap(t: number, vol: number) {
    [0, 0.012, 0.024].forEach((d) => this.noise(t + d, 0.12, vol, 1500));
  }

  /** Koto-like plucked string: bright attack, fast decay, slight pitch drop. */
  private pluck(midi: number, t: number, vol: number) {
    const ctx = this.ctx!;
    const f = this.freq(midi);
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(5000, t);
    lp.frequency.exponentialRampToValueAtTime(900, t + 0.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    for (const [type, mul, v] of [['triangle', 1, 1], ['sine', 2, 0.35], ['sawtooth', 1, 0.15]] as const) {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f * mul * 1.01, t);
      o.frequency.exponentialRampToValueAtTime(f * mul, t + 0.05);
      og.gain.value = v;
      o.connect(og).connect(lp);
      o.start(t);
      o.stop(t + 1);
    }
    lp.connect(g).connect(this.musicGain);
  }

  /** Shakuhachi-style flute: soft sine with delayed vibrato and a breathy attack. */
  private flute(midi: number, t: number, dur: number, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const vib = ctx.createOscillator();
    const vibG = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(this.freq(midi) * 0.97, t);
    o.frequency.exponentialRampToValueAtTime(this.freq(midi), t + 0.08); // slide up into the note
    vib.frequency.value = 5.2;
    vibG.gain.setValueAtTime(0, t);
    vibG.gain.linearRampToValueAtTime(this.freq(midi) * 0.012, t + Math.min(dur, 0.5));
    vib.connect(vibG).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.07);
    g.gain.setValueAtTime(vol, t + Math.max(0.08, dur - 0.12));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
    o.connect(g).connect(this.musicGain);
    o.start(t); vib.start(t);
    o.stop(t + dur + 0.2); vib.stop(t + dur + 0.2);
    this.noise(t, 0.12, vol * 0.5, 2500, this.musicGain); // breath
  }

  /** Taiko drum: deep pitched thump + skin noise. */
  private taiko(t: number, vol: number, hz: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(hz * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(hz, t + 0.08);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g).connect(this.musicGain);
    o.start(t);
    o.stop(t + 0.6);
    this.noise(t, 0.09, vol * 0.4, 400, this.musicGain);
  }

  private freq(midi: number) { return 440 * Math.pow(2, (midi - 69) / 12); }

  private tone(midi: number, t: number, dur: number, type: OscillatorType, vol: number, out: AudioNode, cutoff = 3000, slideTo?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = type;
    o.frequency.setValueAtTime(this.freq(midi), t);
    if (slideTo !== undefined) o.frequency.exponentialRampToValueAtTime(this.freq(slideTo), t + dur);
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noise(t: number, dur: number, vol: number, cutoff: number, out: AudioNode = this.musicGain, sweepTo?: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(cutoff, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t);
  }

  play(name: Sfx) {
    const ctx = this.ensure();
    if (!ctx || !this.sfxOn) return;
    const t = ctx.currentTime;
    const o = this.sfxGain;
    switch (name) {
      case 'coin': this.tone(84, t, 0.08, 'square', 0.12, o); this.tone(91, t + 0.06, 0.14, 'square', 0.12, o); break;
      case 'rare': [84, 88, 91, 96].forEach((n, i) => this.tone(n, t + i * 0.05, 0.12, 'square', 0.1, o)); break;
      case 'crystal': [79, 86, 91, 98, 103].forEach((n, i) => this.tone(n, t + i * 0.045, 0.25, 'sine', 0.16, o)); break;
      case 'dash': this.noise(t, 0.25, 0.4, 600, o, 4000); this.tone(60, t, 0.2, 'sawtooth', 0.06, o, 2000, 84); break;
      case 'hit': this.tone(40, t, 0.25, 'square', 0.25, o, 800, 28); this.noise(t, 0.15, 0.3, 1200, o); break;
      case 'damage': this.tone(52, t, 0.3, 'sawtooth', 0.2, o, 1500, 36); this.noise(t, 0.2, 0.25, 2500, o, 300); break;
      case 'boost': [72, 76, 79, 84].forEach((n, i) => this.tone(n, t + i * 0.06, 0.2, 'triangle', 0.18, o)); break;
      case 'levelup': [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => this.tone(n, t + i * 0.07, 0.35, 'square', 0.1, o, 4000)); break;
      case 'victory': [72, 76, 79, 84, 79, 84, 88].forEach((n, i) => this.tone(n, t + i * 0.12, 0.4, 'square', 0.1, o, 3500)); break;
      case 'gameover': [67, 63, 60, 55].forEach((n, i) => this.tone(n, t + i * 0.18, 0.4, 'sawtooth', 0.1, o, 1200)); break;
      case 'jump': this.tone(64, t, 0.18, 'square', 0.1, o, 2500, 79); break;
      case 'click': this.tone(88, t, 0.04, 'square', 0.05, o); break;
      case 'countdown': this.tone(72, t, 0.15, 'square', 0.12, o); break;
      case 'go': this.tone(84, t, 0.35, 'square', 0.14, o); this.tone(91, t, 0.35, 'square', 0.08, o); break;
    }
  }
}

export const sound = new SoundEngine();
