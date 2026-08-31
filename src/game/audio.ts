export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  muted = false;

  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 1;
      this.sfx.connect(this.master);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.7;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain = 0.15, when = 0): void {
    if (!this.ctx || !this.sfx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(this.sfx);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  shoot(): void {
    this.tone(880, 0.06, "square", 0.08);
    this.tone(1320, 0.04, "square", 0.05, 0.02);
  }

  hit(): void {
    this.tone(220, 0.1, "sawtooth", 0.12);
  }

  explode(): void {
    this.tone(90, 0.25, "sawtooth", 0.2);
    this.tone(60, 0.35, "square", 0.12, 0.05);
  }

  pickup(): void {
    this.tone(523, 0.08, "sine", 0.12);
    this.tone(784, 0.1, "sine", 0.1, 0.06);
    this.tone(1046, 0.12, "sine", 0.08, 0.12);
  }

  damage(): void {
    this.tone(140, 0.2, "sawtooth", 0.18);
    this.tone(100, 0.25, "square", 0.1, 0.05);
  }

  wave(): void {
    this.tone(392, 0.15, "triangle", 0.1);
    this.tone(523, 0.15, "triangle", 0.1, 0.12);
    this.tone(659, 0.2, "triangle", 0.1, 0.24);
  }

  gameOver(): void {
    this.tone(300, 0.3, "sawtooth", 0.15);
    this.tone(200, 0.4, "sawtooth", 0.12, 0.2);
    this.tone(100, 0.6, "sawtooth", 0.1, 0.45);
  }
}
