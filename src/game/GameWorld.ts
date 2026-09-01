export const TILE_TYPES = {
  WALL: '#',
  PATH: '.',
  DATA: 'D',
  PORTAL: 'P',
  VIRUS: 'V',
  SAFE: 'S',
  CACHE: 'C',
  BALCONY: 'B',
  TERMINAL: 'K',
  DOOR: 'G',
} as const;

export type TileType = (typeof TILE_TYPES)[keyof typeof TILE_TYPES];

export const TILE_SPRITES: Record<TileType, string> = {
  '#': 'tile_wall',
  '.': 'tile_path',
  'D': 'tile_terminal',
  'P': 'tile_portal',
  'V': 'enemy_daemon',
  'S': 'tile_safe',
  'C': 'tile_cache',
  'B': 'tile_balcony',
  'K': 'tile_terminal',
  'G': 'tile_door',
};

export const TILE_DESCRIPTIONS: Record<TileType, string> = {
  '#': 'Reinforced Firewall Wall — impassable data block.',
  '.': 'Data Corridor — open path.',
  'D': 'Encrypted Data Store — breach for valuable credits and items.',
  'P': 'Encrypted Master Portal — leads to the Sector Boss / Gate.',
  'V': 'Active Daemon Virus — hostiles will intercept your connection.',
  'S': 'Isolated Safe Node — restores integrity and stabilizes connection.',
  'C': 'Sub-Grid Cache — contains high-value payload and Security Keycard.',
  'B': 'Overclock Balcony — grants +25% attack damage bonus.',
  'K': 'Central Security Terminal — hack to unlock sector security doors.',
  'G': 'Locked Sector Gate — requires terminal override to open.',
};

export interface SerializedWorld {
  width: number;
  height: number;
  grid: TileType[][];
  startPos: { x: number; y: number };
  portalPos: { x: number; y: number };
  explored: string[];
  seed: number;
}

export interface WorldMap {
  width: number;
  height: number;
  grid: TileType[][];
  startPos: { x: number; y: number };
  portalPos: { x: number; y: number };
  seed: number;
}

export class GameWorld {
  private width: number;
  private height: number;
  private grid: TileType[][] = [];
  private startPos = { x: 1, y: 1 };
  private portalPos = { x: 1, y: 1 };
  private explored: Set<string> = new Set();
  private seed: number;

  constructor(width = 15, height = 15, seed = 12345) {
    this.width = width;
    this.height = height;
    this.seed = seed;
    this.generate(seed);
  }

  public getWidth() {
    return this.width;
  }
  public getHeight() {
    return this.height;
  }
  public getGrid() {
    return this.grid;
  }
  public getStartPos() {
    return { ...this.startPos };
  }
  public getPortalPos() {
    return { ...this.portalPos };
  }
  public getExplored() {
    return this.explored;
  }

  public isExplored(x: number, y: number): boolean {
    return this.explored.has(`${x},${y}`);
  }

  public markExplored(x: number, y: number) {
    this.explored.add(`${x},${y}`);
    // Also reveal adjacent neighbors within radius 1 for smooth exploration
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < this.width && ny < this.height) {
          this.explored.add(`${nx},${ny}`);
        }
      }
    }
  }

  public getTile(x: number, y: number): TileType {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return TILE_TYPES.WALL;
    return this.grid[y][x];
  }

  public setTile(x: number, y: number, tile: TileType) {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
      this.grid[y][x] = tile;
    }
  }

  public unlockAllDoors() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] === TILE_TYPES.DOOR) {
          this.grid[y][x] = TILE_TYPES.PATH;
        }
      }
    }
  }

  public generate(seed: number) {
    this.seed = seed;
    this.explored.clear();

    // Initialize wall grid
    this.grid = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => TILE_TYPES.WALL)
    );

    // Simple deterministic PRNG
    let s = seed >>> 0 || 1;
    const rand = () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      s = s >>> 0;
      return (s % 100000) / 100000;
    };
    const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

    // DFS Maze Carve
    const carve = (x: number, y: number) => {
      this.grid[y][x] = TILE_TYPES.PATH;
      const dirs = [
        [0, -2],
        [0, 2],
        [-2, 0],
        [2, 0],
      ].sort(() => rand() - 0.5);

      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (
          ny > 0 &&
          ny < this.height - 1 &&
          nx > 0 &&
          nx < this.width - 1 &&
          this.grid[ny][nx] === TILE_TYPES.WALL
        ) {
          this.grid[y + dy / 2][x + dx / 2] = TILE_TYPES.PATH;
          carve(nx, ny);
        }
      }
    };

    carve(1, 1);
    this.startPos = { x: 1, y: 1 };
    this.grid[1][1] = TILE_TYPES.SAFE;

    // Place key special nodes
    const specials: TileType[] = [
      TILE_TYPES.DATA,
      TILE_TYPES.DATA,
      TILE_TYPES.VIRUS,
      TILE_TYPES.VIRUS,
      TILE_TYPES.VIRUS,
      TILE_TYPES.CACHE,
      TILE_TYPES.BALCONY,
      TILE_TYPES.TERMINAL,
    ];

    for (const sym of specials) {
      for (let tries = 0; tries < 50; tries++) {
        const rx = randInt(1, this.width - 2);
        const ry = randInt(1, this.height - 2);
        if (this.grid[ry][rx] === TILE_TYPES.PATH && (rx !== 1 || ry !== 1)) {
          this.grid[ry][rx] = sym;
          break;
        }
      }
    }

    // Place a locked security door between rooms if terminal exists
    for (let y = 2; y < this.height - 2; y++) {
      for (let x = 2; x < this.width - 2; x++) {
        if (
          this.grid[y][x] === TILE_TYPES.PATH &&
          this.grid[y - 1][x] === TILE_TYPES.WALL &&
          this.grid[y + 1][x] === TILE_TYPES.WALL
        ) {
          this.grid[y][x] = TILE_TYPES.DOOR;
          break;
        }
      }
    }

    // Place Master Portal at a distant position
    let px = this.width - 2;
    let py = this.height - 2;
    while (this.grid[py][px] === TILE_TYPES.WALL) {
      px = randInt(1, this.width - 2);
      py = randInt(1, this.height - 2);
    }
    this.grid[py][px] = TILE_TYPES.PORTAL;
    this.portalPos = { x: px, y: py };

    this.markExplored(1, 1);
  }

  public serialize(): SerializedWorld {
    return {
      width: this.width,
      height: this.height,
      grid: this.grid.map((row) => [...row]),
      startPos: { ...this.startPos },
      portalPos: { ...this.portalPos },
      explored: Array.from(this.explored),
      seed: this.seed,
    };
  }

  public deserialize(data: SerializedWorld) {
    if (!data || !data.grid || !Array.isArray(data.grid)) return;
    this.width = data.width || 15;
    this.height = data.height || 15;
    this.grid = data.grid.map((row) => [...row]);
    this.startPos = data.startPos ? { ...data.startPos } : { x: 1, y: 1 };
    this.portalPos = data.portalPos ? { ...data.portalPos } : { x: 13, y: 13 };
    this.explored = new Set(Array.isArray(data.explored) ? data.explored : []);
    this.seed = typeof data.seed === 'number' ? data.seed : 12345;
  }
}
