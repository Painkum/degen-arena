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

  private ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicOn ? 0.22 : 0;
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
    if (this.ctx) this.musicGain.gain.setTargetAtTime(on ? 0.22 : 0, this.ctx.currentTime, 0.1);
    if (on && this.ctx) this.startMusic();
  }
  setSfx(on: boolean) {
    this.sfxOn = on;
    if (this.ctx) this.sfxGain.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.05);
  }
  setIntensity(v: number) { this.intensity = v; }

  private startMusic() {
    const ctx = this.ctx;
    if (!ctx || this.musicTimer !== null) return;
    this.nextTime = ctx.currentTime + 0.1;
    this.musicTimer = window.setInterval(() => this.schedule(), 50);
  }

  // Simple generative synthwave: pad chords + bass + arpeggio, A minor-ish progression.
  private schedule() {
    const ctx = this.ctx!;
    const bpm = this.intensity > 0.5 ? 118 : 96;
    const sixteenth = 60 / bpm / 4;
    const chords = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]];
    while (this.nextTime < ctx.currentTime + 0.25) {
      const s = this.step % 64;
      const chord = chords[Math.floor(s / 16)];
      const t = this.nextTime;
      if (s % 16 === 0) chord.forEach((n) => this.tone(n - 12, t, sixteenth * 16, 'sawtooth', 0.035, this.musicGain, 900));
      if (s % 4 === 0) this.tone(chord[0] - 24, t, sixteenth * 3, 'triangle', 0.18, this.musicGain, 400);
      if (this.intensity > 0.5 || s % 2 === 0) {
        const arp = chord[(s >> 1) % 3] + ((s >> 3) % 2 ? 12 : 0);
        this.tone(arp + 12, t, sixteenth * 0.9, 'square', 0.025, this.musicGain, 2400);
      }
      if (this.intensity > 0.5 && s % 4 === 0) this.kick(t);
      if (this.intensity > 0.5 && s % 8 === 4) this.noise(t, 0.08, 0.06, 6000, this.musicGain);
      this.nextTime += sixteenth;
      this.step++;
    }
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

  private kick(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(this.musicGain);
    o.start(t);
    o.stop(t + 0.25);
  }

  private noise(t: number, dur: number, vol: number, cutoff: number, out: AudioNode, sweepTo?: number) {
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
