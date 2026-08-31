import { GameAudio } from "./audio";
import { loadSprites, type SpritePack } from "./assets";
import { Input } from "./input";
import { insertScore, loadSave, qualifies, writeSave, type SaveData } from "./save";
import { useGameUI, type Screen } from "./store";

const STEP = 1 / 60;
const MAX_STEPS = 5;
const MARGIN = 28;

type Kind = "scout" | "fighter" | "bomber" | "elite";
type PickupKind = "spread" | "shield" | "speed" | "repair";
type Pattern = "dive" | "sine" | "seek" | "sweep";

type Bullet = { alive: boolean; x: number; y: number; vx: number; vy: number; r: number; ttl: number; fromPlayer: boolean; frame: number };
type Enemy = { alive: boolean; kind: Kind; x: number; y: number; vx: number; vy: number; r: number; hp: number; maxHp: number; fireCd: number; t: number; pattern: Pattern; amp: number; baseX: number; flash: number; score: number; w: number; h: number };
type Pickup = { alive: boolean; kind: PickupKind; x: number; y: number; vy: number; r: number; bob: number };
type Flash = { alive: boolean; x: number; y: number; t: number; rot: number };
type Boom = { alive: boolean; x: number; y: number; t: number; s: number };
type Floater = { alive: boolean; x: number; y: number; t: number; text: string };
type Particle = { alive: boolean; x: number; y: number; vx: number; vy: number; ttl: number; max: number; s: number; hue: number };
type Star = { x: number; y: number; z: number; s: number; a: number };

const KIND: Record<Kind, { hp: number; speed: number; r: number; score: number; w: number; h: number; fire: number }> = {
  scout: { hp: 1, speed: 155, r: 14, score: 80, w: 34, h: 48, fire: 0 },
  fighter: { hp: 2, speed: 120, r: 16, score: 150, w: 46, h: 50, fire: 1.55 },
  bomber: { hp: 5, speed: 72, r: 20, score: 280, w: 54, h: 50, fire: 2.1 },
  elite: { hp: 12, speed: 95, r: 22, score: 700, w: 58, h: 58, fire: 1.05 },
};

function pool<T>(n: number, make: () => T): T[] { return Array.from({ length: n }, make); }
function clamp(v: number, a: number, b: number): number { return Math.max(a, Math.min(b, v)); }
function rand(a: number, b: number): number { return a + Math.random() * (b - a); }

type Spawn = { t: number; kind: Kind; x: number; pattern: Pattern };

function planWave(n: number, w: number): Spawn[] {
  const out: Spawn[] = [];
  const add = (t: number, kind: Kind, x: number, pattern: Pattern) => out.push({ t, kind, x, pattern });
  const nx = (i: number, count: number) => ((i + 1) / (count + 1)) * w;
  if (n % 5 === 0) {
    add(0.15, "elite", w * 0.5, "seek");
    const escorts = 4 + Math.floor(n / 5);
    for (let i = 0; i < escorts; i++) add(0.35 + i * 0.22, "scout", nx(i % 6, 6), i % 2 ? "sine" : "dive");
    if (n >= 10) { add(1.4, "bomber", w * 0.25, "dive"); add(1.4, "bomber", w * 0.75, "dive"); }
    return out;
  }
  const scouts = 4 + Math.min(10, n);
  for (let i = 0; i < scouts; i++) add(0.12 + i * 0.18, "scout", nx(i % 7, 7), n > 2 && i % 3 === 0 ? "sine" : "dive");
  if (n >= 2) { const fighters = 2 + Math.floor(n / 2); for (let i = 0; i < fighters; i++) add(0.8 + i * 0.35, "fighter", nx(i, fighters), "seek"); }
  if (n >= 3) add(1.6, "bomber", w * (n % 2 ? 0.3 : 0.7), "dive");
  if (n >= 4) { add(2.1, "fighter", w * 0.2, "sweep"); add(2.1, "fighter", w * 0.8, "sweep"); }
  return out;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input = new Input();
  private audio = new GameAudio();
  private sprites: SpritePack | null = null;
  private save: SaveData;
  private detach: (() => void) | null = null;
  private raf = 0;
  private last = 0;
  private accum = 0;
  private w = 800;
  private h = 600;
  private reduced = false;
  private screen: Screen = "title";
  private time = 0;
  private player = { x: 400, y: 500, vx: 0, vy: 0, r: 16, hp: 5, maxHp: 5, fireCd: 0, invuln: 0, shieldHits: 0, shieldT: 0, multiT: 0, multiLevel: 1, speedT: 0, flash: 0, alive: true, heading: Math.PI / 2 };
  private bullets: Bullet[] = pool(160, () => ({ alive: false, x: 0, y: 0, vx: 0, vy: 0, r: 5, ttl: 0, fromPlayer: true, frame: 0 }));
  private enemies: Enemy[] = pool(48, () => ({ alive: false, kind: "scout" as Kind, x: 0, y: 0, vx: 0, vy: 0, r: 14, hp: 1, maxHp: 1, fireCd: 0, t: 0, pattern: "dive" as Pattern, amp: 40, baseX: 0, flash: 0, score: 80, w: 34, h: 48 }));
  private pickups: Pickup[] = pool(12, () => ({ alive: false, kind: "spread" as PickupKind, x: 0, y: 0, vy: 70, r: 16, bob: 0 }));
  private flashes: Flash[] = pool(16, () => ({ alive: false, x: 0, y: 0, t: 0, rot: 0 }));
  private booms: Boom[] = pool(24, () => ({ alive: false, x: 0, y: 0, t: 0, s: 1 }));
  private floaters: Floater[] = pool(24, () => ({ alive: false, x: 0, y: 0, t: 0, text: "" }));
  private particles: Particle[] = pool(220, () => ({ alive: false, x: 0, y: 0, vx: 0, vy: 0, ttl: 0, max: 1, s: 1, hue: 190 }));
  private stars: Star[] = [];
  private score = 0;
  private wave = 0;
  private waveT = 0;
  private wavePhase: "intro" | "spawn" | "clear" = "intro";
  private spawns: Spawn[] = [];
  private spawnI = 0;
  private combo = 0;
  private comboT = 0;
  private banner = "";
  private bannerT = 0;
  private trauma = 0;
  private hitstop = 0;
  private hudClock = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unavailable");
    this.ctx = ctx;
    this.save = loadSave();
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  async init(): Promise<void> {
    this.resize();
    this.seedStars();
    this.detach = this.input.attach(this.canvas);
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVis);
    useGameUI.getState().set({ scores: this.save.scores, muted: this.save.muted, shake: this.save.shake, screen: "title", ready: true });
    this.audio.setMuted(this.save.muted);
    this.last = performance.now();
    this.loop(this.last);
    try { this.sprites = await loadSprites(); } catch { this.sprites = null; }
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.detach?.();
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVis);
  }

  startRun(): void { this.audio.unlock(); this.resetRun(); this.screen = "playing"; this.pushUI(); }
  pause(): void { if (this.screen === "playing") { this.screen = "paused"; this.pushUI(); } }
  resume(): void { if (this.screen === "paused") { this.audio.unlock(); this.screen = "playing"; this.pushUI(); } }
  gotoTitle(): void { this.screen = "title"; this.pushUI(); }
  gotoScores(): void { this.screen = "scores"; this.pushUI(); }
  gotoHowTo(): void { this.screen = "howto"; this.pushUI(); }
  toggleMute(): void { this.save.muted = !this.save.muted; this.audio.setMuted(this.save.muted); writeSave(this.save); this.pushUI(); }
  toggleShake(): void { this.save.shake = !this.save.shake; writeSave(this.save); this.pushUI(); }
  submitName(name: string): void {
    const clean = name.trim().slice(0, 12) || "ACE";
    this.save.scores = insertScore(this.save.scores, { name: clean, score: this.score, wave: this.wave, at: Date.now() });
    writeSave(this.save); this.screen = "scores"; this.pushUI();
  }
  setTyping(v: boolean): void { (this.input as { blockKeys?: boolean }).blockKeys = v; }

  private onResize = () => this.resize();
  private onVis = () => { if (document.hidden && this.screen === "playing") this.pause(); else this.audio.unlock(); };

  private resize(): void {
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(this.w * dpr); this.canvas.height = Math.floor(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private seedStars(): void {
    const n = Math.floor((this.w * this.h) / 2800);
    this.stars = [];
    for (let i = 0; i < n; i++) this.stars.push({ x: Math.random() * this.w, y: Math.random() * this.h, z: i % 3, s: i % 3 === 2 ? rand(1.4, 2.2) : i % 3 === 1 ? rand(0.9, 1.4) : rand(0.5, 0.9), a: i % 3 === 2 ? rand(0.7, 1) : i % 3 === 1 ? rand(0.4, 0.7) : rand(0.18, 0.4) });
  }

  private resetRun(): void {
    this.score = 0; this.wave = 0; this.combo = 0; this.comboT = 0; this.trauma = 0; this.hitstop = 0; this.time = 0;
    this.player.x = this.w * 0.5; this.player.y = this.h * 0.78; this.player.vx = 0; this.player.vy = 0;
    this.player.hp = 5; this.player.maxHp = 5; this.player.fireCd = 0; this.player.invuln = 1.1;
    this.player.shieldHits = 0; this.player.shieldT = 0; this.player.multiT = 0; this.player.multiLevel = 1; this.player.speedT = 0; this.player.flash = 0; this.player.alive = true;
    for (const list of [this.bullets, this.enemies, this.pickups, this.flashes, this.booms, this.floaters, this.particles]) for (const it of list) (it as { alive: boolean }).alive = false;
    this.beginWave(1);
  }

  private beginWave(n: number): void {
    this.wave = n; this.waveT = 0; this.wavePhase = "intro"; this.spawns = planWave(n, this.w); this.spawnI = 0;
    this.banner = `WAVE ${String(n).padStart(2, "0")}`; this.bannerT = 1.6; this.audio.wave();
  }

  private grab<T extends { alive: boolean }>(list: T[]): T | null { for (const it of list) if (!it.alive) return it; return null; }

  private spawnEnemy(s: Spawn): void {
    const e = this.grab(this.enemies); if (!e) return;
    const def = KIND[s.kind]; const hpScale = 1 + Math.max(0, this.wave - 6) * 0.12;
    e.alive = true; e.kind = s.kind; e.x = clamp(s.x, 40, this.w - 40); e.y = -36; e.vx = 0; e.vy = def.speed;
    e.r = def.r; e.hp = Math.ceil(def.hp * hpScale); e.maxHp = e.hp; e.fireCd = rand(0.4, 1.2); e.t = 0;
    e.pattern = s.pattern; e.amp = rand(36, 70); e.baseX = e.x; e.flash = 0; e.score = def.score; e.w = def.w; e.h = def.h;
    if (s.pattern === "sweep") { e.x = s.x < this.w * 0.5 ? -30 : this.w + 30; e.y = rand(60, 140); e.vx = s.x < this.w * 0.5 ? def.speed : -def.speed; e.vy = def.speed * 0.25; }
  }

  private spawnBullet(x: number, y: number, vx: number, vy: number, fromPlayer: boolean): void {
    const b = this.grab(this.bullets); if (!b) return;
    b.alive = true; b.x = x; b.y = y; b.vx = vx; b.vy = vy; b.r = fromPlayer ? 5 : 6; b.ttl = 1.8; b.fromPlayer = fromPlayer; b.frame = 0;
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    let dt = (now - this.last) / 1000; this.last = now; if (dt > 0.1) dt = 0.1; this.accum += dt;
    if (this.input.consumePause()) { if (this.screen === "playing") this.pause(); else if (this.screen === "paused") this.resume(); }
    let steps = 0;
    while (this.accum >= STEP && steps < MAX_STEPS) {
      if (this.hitstop > 0) this.hitstop -= STEP;
      else if (this.screen === "playing") this.step(STEP);
      else this.stepIdle(STEP);
      this.accum -= STEP; steps++;
    }
    this.draw();
    this.hudClock += dt;
    if (this.hudClock > 0.08) { this.hudClock = 0; if (this.screen === "playing" || this.screen === "paused") this.pushHud(); }
  };

  private stepIdle(dt: number): void { this.time += dt; this.scrollStars(dt, 0.45); this.trauma = Math.max(0, this.trauma - dt * 2.2); }

  private step(dt: number): void {
    this.time += dt; const act = this.input.sample();
    this.scrollStars(dt, 1); this.tickWave(dt); this.tickPlayer(dt, act); this.tickEnemies(dt); this.tickBullets(dt); this.tickPickups(dt); this.collide(); this.tickFx(dt);
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    if (this.bannerT > 0) this.bannerT -= dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
  }

  private scrollStars(dt: number, mul: number): void {
    const speeds = [22, 48, 96];
    for (const s of this.stars) { s.y += speeds[s.z]! * mul * dt; if (s.y > this.h + 4) { s.y = -4; s.x = Math.random() * this.w; } }
  }

  private tickWave(dt: number): void {
    this.waveT += dt;
    if (this.wavePhase === "intro") { if (this.waveT > 1.1) { this.wavePhase = "spawn"; this.waveT = 0; } return; }
    if (this.wavePhase === "spawn") {
      while (this.spawnI < this.spawns.length && this.spawns[this.spawnI]!.t <= this.waveT) { this.spawnEnemy(this.spawns[this.spawnI]!); this.spawnI++; }
      if (this.spawnI >= this.spawns.length) this.wavePhase = "clear"; return;
    }
    if (!this.enemies.some((e) => e.alive) && this.waveT > (this.spawns[this.spawns.length - 1]?.t ?? 0) + 0.6) this.beginWave(this.wave + 1);
  }

  private tickPlayer(dt: number, act: ReturnType<Input["sample"]>): void {
    const p = this.player; if (!p.alive) return;
    const boost = p.speedT > 0; const speed = boost ? 620 : 420;
    let mx = act.moveX, my = act.moveY;
    if (act.pointerActive && !this.input.hasInjected()) {
      const dx = act.pointerX - p.x, dy = act.pointerY - p.y, dist = Math.hypot(dx, dy);
      if (dist > 6) { const k = 1 - Math.exp(-10 * dt); p.x += dx * k; p.y += dy * k; mx = dx / dist; my = dy / dist; }
    } else { p.x += mx * speed * dt; p.y += my * speed * dt; }
    p.x = clamp(p.x, MARGIN, this.w - MARGIN); p.y = clamp(p.y, MARGIN, this.h - MARGIN);
    if (p.fireCd > 0) p.fireCd -= dt; if (p.invuln > 0) p.invuln -= dt; if (p.multiT > 0) p.multiT -= dt; if (p.speedT > 0) p.speedT -= dt;
    if (p.shieldT > 0) { p.shieldT -= dt; if (p.shieldT <= 0) p.shieldHits = 0; }
    if (p.fireCd <= 0) {
      const level = p.multiT > 0 ? (p.multiLevel >= 2 ? 5 : 3) : 1;
      const angles = level === 1 ? [0] : level === 3 ? [-0.22, 0, 0.22] : [-0.38, -0.19, 0, 0.19, 0.38];
      for (const a of angles) this.spawnBullet(p.x + Math.sin(a) * 6, p.y - 26, Math.sin(a) * 720, -Math.cos(a) * 720, true);
      this.audio.shoot(); p.fireCd = p.multiT > 0 ? 0.1 : 0.14;
    }
  }

  private tickEnemies(dt: number): void {
    const p = this.player; const fireMul = Math.max(0.55, 1 - this.wave * 0.03);
    for (const e of this.enemies) {
      if (!e.alive) continue; e.t += dt;
      const def = KIND[e.kind];
      if (e.pattern === "dive") { e.vy = def.speed; e.vx = 0; }
      else if (e.pattern === "sine") { e.vy = def.speed * 0.85; e.x = e.baseX + Math.sin(e.t * 2.4) * e.amp; }
      else if (e.pattern === "seek") { e.vx = clamp((p.x - e.x) * 1.4, -def.speed * 0.7, def.speed * 0.7); e.vy = def.speed * 0.7; }
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.kind !== "scout") {
        e.fireCd -= dt;
        if (e.fireCd <= 0 && e.y > 20 && e.y < this.h * 0.72) {
          const spd = 220 + this.wave * 8;
          this.spawnBullet(e.x, e.y + 16, 0, spd, false); e.fireCd = def.fire * fireMul;
        }
      }
      if (e.y > this.h + 50 || e.x < -80 || e.x > this.w + 80) e.alive = false;
    }
  }

  private tickBullets(dt: number): void {
    for (const b of this.bullets) {
      if (!b.alive) continue; b.x += b.vx * dt; b.y += b.vy * dt; b.ttl -= dt; b.frame += dt * 12;
      if (b.ttl <= 0 || b.y < -30 || b.y > this.h + 30 || b.x < -30 || b.x > this.w + 30) b.alive = false;
    }
  }

  private tickPickups(dt: number): void {
    for (const p of this.pickups) { if (!p.alive) continue; p.y += p.vy * dt; p.bob += dt; if (p.y > this.h + 30) p.alive = false; }
  }

  private tickFx(dt: number): void {
    for (const f of this.flashes) if (f.alive) { f.t += dt; if (f.t > 0.12) f.alive = false; }
    for (const b of this.booms) if (b.alive) { b.t += dt; if (b.t > 0.32) b.alive = false; }
    for (const f of this.floaters) if (f.alive) { f.t += dt; f.y -= 30 * dt; if (f.t > 0.8) f.alive = false; }
    for (const p of this.particles) if (p.alive) { p.x += p.vx * dt; p.y += p.vy * dt; p.ttl -= dt; if (p.ttl <= 0) p.alive = false; }
  }

  private collide(): void {
    const p = this.player;
    for (const b of this.bullets) {
      if (!b.alive || !b.fromPlayer) continue;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
          b.alive = false; e.hp -= 1; e.flash = 0.08;
          if (e.hp <= 0) {
            e.alive = false; this.score += e.score; this.combo += 1; this.comboT = 2;
            this.audio.explode(); this.spawnBoom(e.x, e.y); this.spawnFloater(e.x, e.y, `+${e.score}`);
            if (Math.random() < 0.22) this.spawnPickup(e.x, e.y);
          } else this.audio.hit();
        }
      }
    }
    if (!p.alive) return;
    for (const b of this.bullets) {
      if (!b.alive || b.fromPlayer) continue;
      if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + p.r) { b.alive = false; this.hurtPlayer(1); }
    }
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r) { e.alive = false; this.hurtPlayer(1); this.audio.explode(); this.spawnBoom(e.x, e.y); }
    }
    for (const pk of this.pickups) {
      if (!pk.alive) continue;
      if (Math.hypot(pk.x - p.x, pk.y - p.y) < pk.r + p.r) {
        pk.alive = false; this.audio.pickup();
        if (pk.kind === "spread") { p.multiT = 8; p.multiLevel = Math.min(2, p.multiLevel + 1); }
        else if (pk.kind === "shield") { p.shieldHits = 3; p.shieldT = 12; }
        else if (pk.kind === "speed") p.speedT = 6;
        else if (pk.kind === "repair") p.hp = Math.min(p.maxHp, p.hp + 1);
      }
    }
  }

  private spawnPickup(x: number, y: number): void {
    const pk = this.grab(this.pickups); if (!pk) return;
    const kinds: PickupKind[] = ["spread", "shield", "speed", "repair"];
    pk.alive = true; pk.kind = kinds[Math.floor(Math.random() * kinds.length)]!; pk.x = x; pk.y = y; pk.vy = 78; pk.r = 16; pk.bob = 0;
  }
  private spawnBoom(x: number, y: number): void { const b = this.grab(this.booms); if (!b) return; b.alive = true; b.x = x; b.y = y; b.t = 0; b.s = 1; }
  private spawnFloater(x: number, y: number, text: string): void { const f = this.grab(this.floaters); if (!f) return; f.alive = true; f.x = x; f.y = y; f.t = 0; f.text = text; }

  private hurtPlayer(dmg: number): void {
    const p = this.player; if (p.invuln > 0) return;
    if (p.shieldHits > 0) { p.shieldHits -= 1; p.invuln = 0.6; this.audio.hit(); return; }
    p.hp -= dmg; p.invuln = 1.2; p.flash = 0.2; this.audio.damage(); this.trauma = 1;
    if (p.hp <= 0) { p.alive = false; this.audio.gameOver(); this.screen = "gameover"; useGameUI.getState().set({ qualifies: qualifies(this.score, this.save.scores), lastScore: this.score, lastWave: this.wave }); this.pushUI(); }
  }

  private pushUI(): void {
    useGameUI.getState().set({ screen: this.screen, scores: this.save.scores, muted: this.save.muted, shake: this.save.shake });
    this.pushHud();
  }

  private pushHud(): void {
    const p = this.player;
    useGameUI.getState().set({
      hud: { hp: p.hp, maxHp: p.maxHp, score: this.score, wave: this.wave, shieldHits: p.shieldHits, multiT: p.multiT, speedT: p.speedT, banner: this.bannerT > 0 ? this.banner : "" },
    });
  }

  private draw(): void {
    const ctx = this.ctx; const { w, h } = this;
    ctx.fillStyle = "#07080c"; ctx.fillRect(0, 0, w, h);
    for (const s of this.stars) { ctx.globalAlpha = s.a; ctx.fillStyle = "#c8d0e0"; ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      ctx.fillStyle = e.flash > 0 ? "#fff" : e.kind === "elite" ? "#c45c5c" : e.kind === "bomber" ? "#8b909c" : "#8fb4c4";
      ctx.beginPath(); ctx.moveTo(e.x, e.y + e.h * 0.4); ctx.lineTo(e.x - e.w * 0.4, e.y - e.h * 0.4); ctx.lineTo(e.x + e.w * 0.4, e.y - e.h * 0.4); ctx.closePath(); ctx.fill();
    }
    for (const b of this.bullets) {
      if (!b.alive) continue;
      ctx.fillStyle = b.fromPlayer ? "#8fb4c4" : "#c45c5c";
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    }
    for (const pk of this.pickups) {
      if (!pk.alive) continue;
      ctx.fillStyle = "#7aa88a"; ctx.beginPath(); ctx.arc(pk.x, pk.y + Math.sin(pk.bob * 4) * 3, pk.r, 0, Math.PI * 2); ctx.fill();
    }
    if (this.player.alive) {
      const p = this.player;
      ctx.globalAlpha = p.invuln > 0 && Math.floor(this.time * 20) % 2 ? 0.4 : 1;
      ctx.fillStyle = "#e8eaef";
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 20); ctx.lineTo(p.x - 14, p.y + 16); ctx.lineTo(p.x + 14, p.y + 16); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      if (p.shieldHits > 0) { ctx.strokeStyle = "rgba(143,180,196,0.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 28, 0, Math.PI * 2); ctx.stroke(); }
    }
    for (const f of this.floaters) {
      if (!f.alive) continue; ctx.globalAlpha = 1 - f.t / 0.8; ctx.fillStyle = "#e8eaef"; ctx.font = "12px Oxanium,sans-serif"; ctx.fillText(f.text, f.x, f.y); ctx.globalAlpha = 1;
    }
  }
}
