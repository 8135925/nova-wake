export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  muted = false;

  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 0.7;
      this.sfx.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(v: boolean): void {
    this.muted = v;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(v ? 0 : 1, this.ctx.currentTime, 0.02);
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0): void {
    if (!this.ctx || !this.sfx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain: number, hp = 400): void {
    if (!this.ctx || !this.sfx || this.muted) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = hp;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfx);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  shoot(): void {
    const jitter = 1 + (Math.random() * 2 - 1) * 0.08;
    this.tone(880 * jitter, 0.07, "square", 0.045);
    this.tone(1320 * jitter, 0.04, "triangle", 0.03);
  }

  hit(): void {
    this.tone(240, 0.08, "square", 0.05, -80);
    this.noise(0.06, 0.08, 800);
  }

  explode(): void {
    this.noise(0.28, 0.16, 180);
    this.tone(140, 0.22, "sawtooth", 0.07, -90);
  }

  pickup(): void {
    this.tone(523, 0.08, "triangle", 0.07);
    this.tone(784, 0.12, "triangle", 0.06);
  }

  hurt(): void {
    this.tone(180, 0.18, "sawtooth", 0.08, -100);
    this.noise(0.12, 0.1, 300);
  }

  damage(): void {
    this.hurt();
  }

  gameOver(): void {
    this.tone(180, 0.3, "sawtooth", 0.1, -120);
    this.noise(0.35, 0.12, 200);
  }

  wave(): void {
    this.tone(392, 0.12, "triangle", 0.05);
    this.tone(523, 0.18, "triangle", 0.05);
  }

  ui(): void {
    this.tone(660, 0.06, "triangle", 0.04);
  }

  shield(): void {
    this.tone(440, 0.1, "sine", 0.05);
    this.tone(880, 0.16, "sine", 0.04);
  }
}
