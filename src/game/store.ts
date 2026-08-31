import { create } from "zustand";
import type { ScoreRow } from "./save";

export type Screen = "title" | "playing" | "paused" | "gameover" | "scores" | "howto";

export type Hud = {
  hp: number;
  maxHp: number;
  score: number;
  wave: number;
  shieldHits: number;
  multiT: number;
  speedT: number;
  banner: string;
};

export type GameUI = {
  screen: Screen;
  hud: Hud;
  scores: ScoreRow[];
  muted: boolean;
  shake: boolean;
  qualifies: boolean;
  lastScore: number;
  lastWave: number;
  ready: boolean;
  set: (partial: Partial<GameUI>) => void;
};

const emptyHud: Hud = {
  hp: 5,
  maxHp: 5,
  score: 0,
  wave: 0,
  shieldHits: 0,
  multiT: 0,
  speedT: 0,
  banner: "",
};

export const useGameUI = create<GameUI>((set) => ({
  screen: "title",
  hud: emptyHud,
  scores: [],
  muted: false,
  shake: true,
  qualifies: false,
  lastScore: 0,
  lastWave: 0,
  ready: false,
  set: (partial) => set(partial),
}));
