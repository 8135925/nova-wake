import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  Crosshair,
  Gauge,
  Pause,
  Play,
  Shield,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Game } from "@/game/engine";
import { useGameUI } from "@/game/store";
import { cn } from "@/lib/utils";

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new Game(canvas);
    gameRef.current = game;
    void game.init();
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="game-root">
      <canvas ref={canvasRef} className="game-canvas" aria-label="Nova Wake playfield" />
      <Overlay gameRef={gameRef} />
    </div>
  );
}

function Overlay({ gameRef }: { gameRef: RefObject<Game | null> }) {
  const screen = useGameUI((s) => s.screen);
  const play = screen === "playing";
  const g = () => gameRef.current;

  return (
    <div className="game-overlay">
      {play && <Hud onPause={() => g()?.pause()} />}
      {screen !== "playing" && (
        <div className="hit absolute inset-0 flex items-center justify-center bg-bg/70 px-4">
          {screen === "title" && <TitleCard g={g} />}
          {screen === "howto" && <HowToCard g={g} />}
          {screen === "scores" && <ScoresCard g={g} />}
          {screen === "paused" && <PauseCard g={g} />}
          {screen === "gameover" && <OverCard gameRef={gameRef} />}
        </div>
      )}
    </div>
  );
}

function Hud({ onPause }: { onPause: () => void }) {
  const hud = useGameUI((s) => s.hud);
  return (
    <>
      <div className="absolute top-0 right-0 left-0 flex items-start justify-between gap-3 px-4 pt-4 pb-2 sm:px-6 sm:pt-5">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: hud.maxHp }, (_, i) => (
            <span
              key={i}
              className={cn("block h-2.5 w-5 rounded-xs", i < hud.hp ? "bg-fg" : "bg-fg/15")}
              aria-hidden
            />
          ))}
          <span className="sr-only">
            Hull {hud.hp} of {hud.maxHp}
          </span>
        </div>
        <div className="text-center">
          <div className="hud-num text-muted text-xs tracking-widest uppercase">
            Wave {String(hud.wave).padStart(2, "0")}
          </div>
          <div className="hud-num text-xl font-semibold tracking-wide sm:text-2xl">
            {hud.score.toLocaleString()}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onPause} aria-label="Pause" className="pointer-events-auto">
          <Pause className="size-5" />
        </Button>
      </div>
      {hud.banner ? (
        <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 text-center">
          <div className="nv-enter bg-surface/80 rounded-md px-4 py-2 text-sm tracking-widest uppercase backdrop-blur-sm">
            {hud.banner}
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none absolute right-4 bottom-4 left-4 flex items-end justify-between gap-2 sm:right-6 sm:bottom-6 sm:left-6">
        <div className="flex gap-2">
          {hud.shieldHits > 0 && (
            <Pill icon={<Shield className="size-3.5" />} label={`Shield ${hud.shieldHits}`} />
          )}
          {hud.multiT > 0 && <Pill icon={<Zap className="size-3.5" />} label="Spread" />}
          {hud.speedT > 0 && <Pill icon={<Gauge className="size-3.5" />} label="Boost" />}
        </div>
        <div className="text-muted text-xs tracking-wide uppercase opacity-70">
          <Crosshair className="mr-1 inline size-3" /> Aim · Fire auto
        </div>
      </div>
    </>
  );
}

function Pill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="bg-surface/80 text-fg flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs backdrop-blur-sm">
      {icon}
      {label}
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="nv-enter border-border bg-surface max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border p-6 shadow-2xl sm:p-8">
      {children}
    </div>
  );
}

function TitleCard({ g }: { g: () => { startRun: () => void; gotoHowTo: () => void; gotoScores: () => void } | null }) {
  return (
    <Panel>
      <p className="text-muted text-xs tracking-[0.25em] uppercase">Orbital Patrol</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-wide sm:text-5xl">NOVA WAKE</h1>
      <p className="text-muted mt-4 text-sm leading-relaxed">
        Hold the line through incoming waves. Collect power-ups. Survive.
      </p>
      <div className="mt-8 flex flex-col gap-2">
        <Button size="lg" onClick={() => g()?.startRun()}>
          <Play className="size-4" /> Launch
        </Button>
        <Button variant="secondary" onClick={() => g()?.gotoHowTo()}>
          How to play
        </Button>
        <Button variant="ghost" onClick={() => g()?.gotoScores()}>
          High scores
        </Button>
      </div>
    </Panel>
  );
}

function HowToCard({ g }: { g: () => { gotoTitle: () => void; startRun: () => void } | null }) {
  return (
    <Panel>
      <h2 className="text-2xl font-semibold tracking-wide">How to play</h2>
      <ul className="text-muted mt-4 space-y-2 text-sm leading-relaxed">
        <li>· Move with WASD or arrow keys; on mobile, drag on the field.</li>
        <li>· You fire automatically toward the pointer / aim direction.</li>
        <li>· Destroy waves of hostiles; pick up spread, shield, speed, and repair.</li>
        <li>· Pause with Esc or P.</li>
      </ul>
      <div className="mt-8 flex flex-col gap-2">
        <Button onClick={() => g()?.startRun()}>Launch</Button>
        <Button variant="ghost" onClick={() => g()?.gotoTitle()}>
          Back
        </Button>
      </div>
    </Panel>
  );
}

function ScoresCard({ g }: { g: () => { gotoTitle: () => void } | null }) {
  const scores = useGameUI((s) => s.scores);
  return (
    <Panel>
      <h2 className="text-2xl font-semibold tracking-wide">High scores</h2>
      <ol className="mt-4 space-y-2">
        {scores.length === 0 && <li className="text-muted text-sm">No scores yet.</li>}
        {scores.map((row, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted w-6">{i + 1}</span>
            <span className="flex-1 tracking-widest uppercase">{row.name}</span>
            <span className="hud-num font-semibold">{row.score.toLocaleString()}</span>
          </li>
        ))}
      </ol>
      <Button variant="ghost" className="mt-8 w-full" onClick={() => g()?.gotoTitle()}>
        Back
      </Button>
    </Panel>
  );
}

function PauseCard({ g }: { g: () => { resume: () => void; toggleMute: () => void; toggleShake: () => void; gotoTitle: () => void } | null }) {
  const muted = useGameUI((s) => s.muted);
  const shake = useGameUI((s) => s.shake);
  return (
    <Panel>
      <h2 className="text-2xl font-semibold tracking-wide">Paused</h2>
      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={() => g()?.resume()}>
          <Play className="size-4" /> Resume
        </Button>
        <Button variant="secondary" onClick={() => g()?.toggleMute()}>
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          {muted ? "Sound off" : "Sound on"}
        </Button>
        <Button variant="secondary" onClick={() => g()?.toggleShake()}>
          <Gauge className="size-4" />
          {shake ? "Shake on" : "Shake off"}
        </Button>
        <Button variant="ghost" onClick={() => g()?.gotoTitle()}>
          Title
        </Button>
      </div>
    </Panel>
  );
}

function OverCard({ gameRef }: { gameRef: RefObject<Game | null> }) {
  const qualifies = useGameUI((s) => s.qualifies);
  const score = useGameUI((s) => s.lastScore);
  const wave = useGameUI((s) => s.lastWave);
  const [name, setName] = useState("ACE");

  useEffect(() => {
    gameRef.current?.setTyping(qualifies);
    return () => gameRef.current?.setTyping(false);
  }, [qualifies, gameRef]);

  return (
    <Panel>
      <p className="text-muted text-xs tracking-widest uppercase">Ship down</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-wide">NOVA LOST</h2>
      <div className="mt-5 flex gap-6">
        <Stat label="Score" value={score.toLocaleString()} />
        <Stat label="Wave" value={String(wave).padStart(2, "0")} />
      </div>
      {qualifies ? (
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            gameRef.current?.submitName(name);
          }}
        >
          <label className="text-muted text-xs tracking-widest uppercase">Callsign</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 12))}
            maxLength={12}
            className="border-border bg-bg mt-2 h-11 w-full rounded-md border px-3 text-sm tracking-widest uppercase outline-none focus:ring-2 focus:ring-accent/70"
            autoFocus
          />
          <Button type="submit" className="mt-3 w-full">
            Save score
          </Button>
        </form>
      ) : null}
      <div className="mt-6 flex flex-col gap-2">
        {!qualifies ? (
          <Button variant="secondary" onClick={() => gameRef.current?.gotoScores()}>
            High Scores
          </Button>
        ) : null}
        <Button variant={qualifies ? "secondary" : "default"} onClick={() => gameRef.current?.startRun()}>
          Play again
        </Button>
        <Button variant="ghost" onClick={() => gameRef.current?.gotoTitle()}>
          Title
        </Button>
      </div>
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted text-xs tracking-widest uppercase">{label}</div>
      <div className="hud-num mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
