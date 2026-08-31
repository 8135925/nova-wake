export type Actions = {
  moveX: number;
  moveY: number;
  fire: boolean;
  pause: boolean;
  pointerActive: boolean;
  pointerX: number;
  pointerY: number;
};

export class Input {
  private keys = new Set<string>();
  private injected: string[] | null = null;
  private pauseEdge = false;
  private pointerActive = false;
  private pointerId: number | null = null;
  private pointerX = 0;
  private pointerY = 0;

  attach(canvas: HTMLCanvasElement): () => void {
    const onDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      this.keys.add(e.code);
      if (e.code === "Escape" || e.code === "KeyP") this.pauseEdge = true;
    };
    const onUp = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    };
    const clear = () => {
      this.keys.clear();
      this.pointerActive = false;
      this.pointerId = null;
    };

    const onPtrDown = (e: PointerEvent) => {
      if (this.pointerId !== null) return;
      this.pointerId = e.pointerId;
      this.pointerActive = true;
      canvas.setPointerCapture(e.pointerId);
      const rect = canvas.getBoundingClientRect();
      this.pointerX = ((e.clientX - rect.left) / rect.width) * canvas.width;
      this.pointerY = ((e.clientY - rect.top) / rect.height) * canvas.height;
    };
    const onPtrMove = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      const rect = canvas.getBoundingClientRect();
      this.pointerX = ((e.clientX - rect.left) / rect.width) * canvas.width;
      this.pointerY = ((e.clientY - rect.top) / rect.height) * canvas.height;
    };
    const onPtrUp = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerActive = false;
      this.pointerId = null;
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clear();
    });
    canvas.addEventListener("pointerdown", onPtrDown);
    canvas.addEventListener("pointermove", onPtrMove);
    canvas.addEventListener("pointerup", onPtrUp);
    canvas.addEventListener("pointercancel", onPtrUp);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
      canvas.removeEventListener("pointerdown", onPtrDown);
      canvas.removeEventListener("pointermove", onPtrMove);
      canvas.removeEventListener("pointerup", onPtrUp);
      canvas.removeEventListener("pointercancel", onPtrUp);
    };
  }

  setKeys(codes: string[]): void {
    this.injected = codes;
    if (codes.length === 0) this.injected = null;
  }

  hasInjected(): boolean {
    return this.injected !== null;
  }

  consumePause(): boolean {
    const v = this.pauseEdge;
    this.pauseEdge = false;
    return v;
  }

  sample(): Actions {
    const has = (c: string) => (this.injected ? this.injected.includes(c) : this.keys.has(c));
    let x = 0;
    let y = 0;
    if (has("KeyA") || has("ArrowLeft")) x -= 1;
    if (has("KeyD") || has("ArrowRight")) x += 1;
    if (has("KeyW") || has("ArrowUp")) y -= 1;
    if (has("KeyS") || has("ArrowDown")) y += 1;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return {
      moveX: x,
      moveY: y,
      fire: true,
      pause: false,
      pointerActive: this.pointerActive,
      pointerX: this.pointerX,
      pointerY: this.pointerY,
    };
  }
}
