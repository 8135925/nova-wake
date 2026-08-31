export type ScoreRow = { name: string; score: number; wave: number; at: number };

export type SaveData = {
  scores: ScoreRow[];
  muted: boolean;
  shake: boolean;
};

const KEY = "nova-wake-save-v1";
const MAX_SCORES = 10;

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { scores: [], muted: false, shake: true };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      scores: Array.isArray(parsed.scores) ? parsed.scores.slice(0, MAX_SCORES) : [],
      muted: Boolean(parsed.muted),
      shake: parsed.shake !== false,
    };
  } catch {
    return { scores: [], muted: false, shake: true };
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

export function qualifies(score: number, scores: ScoreRow[]): boolean {
  if (score <= 0) return false;
  if (scores.length < MAX_SCORES) return true;
  return score > (scores[scores.length - 1]?.score ?? 0);
}

export function insertScore(scores: ScoreRow[], row: ScoreRow): ScoreRow[] {
  const next = [...scores, row].sort((a, b) => b.score - a.score || b.wave - a.wave);
  return next.slice(0, MAX_SCORES);
}
