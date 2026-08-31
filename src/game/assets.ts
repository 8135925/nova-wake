export type SpritePack = {
  player: HTMLImageElement;
  scout: HTMLImageElement;
  fighter: HTMLImageElement;
  bomber: HTMLImageElement;
  elite: HTMLImageElement;
  boltP: HTMLImageElement[];
  boltE: HTMLImageElement[];
  muzzle: HTMLImageElement[];
  explode: HTMLImageElement[];
  spread: HTMLImageElement;
  shield: HTMLImageElement;
  speed: HTMLImageElement;
  repair: HTMLImageElement;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

async function loadMany(paths: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(paths.map(loadImage));
}

export async function loadSprites(): Promise<SpritePack> {
  const [player, scout, fighter, bomber, elite, spread, shield, speed, repair, boltP, boltE, muzzle, explode] =
    await Promise.all([
      loadImage("/sprites/player.png"),
      loadImage("/sprites/enemy-scout.png"),
      loadImage("/sprites/enemy-fighter.png"),
      loadImage("/sprites/enemy-bomber.png"),
      loadImage("/sprites/enemy-elite.png"),
      loadImage("/sprites/pickup-spread.png"),
      loadImage("/sprites/pickup-shield.png"),
      loadImage("/sprites/pickup-speed.png"),
      loadImage("/sprites/pickup-repair.png"),
      loadMany(["/sprites/bolt-p1.png", "/sprites/bolt-p2.png", "/sprites/bolt-p3.png", "/sprites/bolt-p4.png"]),
      loadMany(["/sprites/bolt-e1.png", "/sprites/bolt-e2.png", "/sprites/bolt-e3.png", "/sprites/bolt-e4.png"]),
      loadMany(["/sprites/muzzle-1.png", "/sprites/muzzle-2.png", "/sprites/muzzle-3.png", "/sprites/muzzle-4.png"]),
      loadMany([
        "/sprites/explode-1.png",
        "/sprites/explode-2.png",
        "/sprites/explode-3.png",
        "/sprites/explode-4.png",
      ]),
    ]);
  return { player, scout, fighter, bomber, elite, boltP, boltE, muzzle, explode, spread, shield, speed, repair };
}
