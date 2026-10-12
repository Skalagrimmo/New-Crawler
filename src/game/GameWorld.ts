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

    this.grid = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => TILE_TYPES.WALL)
    );

    // Seeded xorshift PRNG keeps the same seed reproducible.
    let state = seed >>> 0 || 1;
    const rand = () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return (state % 100000) / 100000;
    };
    const randInt = (min: number, max: number) =>
      Math.floor(rand() * (max - min + 1)) + min;
    const shuffle = <T,>(items: T[]): T[] => {
      const result = [...items];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    };

    // Carve a connected spanning maze first. These paths remain the guaranteed route.
    const carve = (x: number, y: number) => {
      this.grid[y][x] = TILE_TYPES.PATH;
      const dirs = shuffle([
        [0, -2],
        [0, 2],
        [-2, 0],
        [2, 0],
      ]);
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

    // Odd dimensions make the two-cell carving grid symmetrical.
    const startX = Math.min(1, this.width - 2);
    const startY = Math.min(1, this.height - 2);
    carve(startX, startY);
    this.startPos = { x: startX, y: startY };
    this.grid[startY][startX] = TILE_TYPES.SAFE;

    // Add optional cross-links between corridors. This creates loops and alternate routes
    // without destroying the original connected path through the level.
    const loopCandidates: Array<{ x: number; y: number }> = [];
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.grid[y][x] !== TILE_TYPES.WALL) continue;
        const horizontal = this.grid[y][x - 1] !== TILE_TYPES.WALL &&
          this.grid[y][x + 1] !== TILE_TYPES.WALL;
        const vertical = this.grid[y - 1][x] !== TILE_TYPES.WALL &&
          this.grid[y + 1][x] !== TILE_TYPES.WALL;
        if (horizontal || vertical) loopCandidates.push({ x, y });
      }
    }

    const loopCells: Array<{ x: number; y: number }> = [];
    const loopTarget = Math.max(8, Math.floor((this.width * this.height) * 0.018));
    for (const cell of shuffle(loopCandidates)) {
      if (loopCells.length >= loopTarget) break;
      if (this.grid[cell.y][cell.x] !== TILE_TYPES.WALL) continue;
      const horizontal = this.grid[cell.y][cell.x - 1] !== TILE_TYPES.WALL &&
        this.grid[cell.y][cell.x + 1] !== TILE_TYPES.WALL;
      const vertical = this.grid[cell.y - 1][cell.x] !== TILE_TYPES.WALL &&
        this.grid[cell.y + 1][cell.x] !== TILE_TYPES.WALL;
      if (!horizontal && !vertical) continue;
      this.grid[cell.y][cell.x] = TILE_TYPES.PATH;
      loopCells.push(cell);
    }

    // Breadth-first distances help put the exit far from the start and distribute objectives.
    const distances = new Map<string, number>();
    const queue: Array<{ x: number; y: number }> = [{ ...this.startPos }];
    distances.set(`${startX},${startY}`, 0);
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head];
      const nextDistance = (distances.get(`${current.x},${current.y}`) ?? 0) + 1;
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const x = current.x + dx;
        const y = current.y + dy;
        const key = `${x},${y}`;
        if (
          x < 0 || y < 0 || x >= this.width || y >= this.height ||
          this.grid[y][x] === TILE_TYPES.WALL || distances.has(key)
        ) continue;
        distances.set(key, nextDistance);
        queue.push({ x, y });
      }
    }

    const reachable = queue.filter(({ x, y }) =>
      this.grid[y][x] === TILE_TYPES.PATH && (x !== startX || y !== startY)
    );
    reachable.sort((a, b) =>
      (distances.get(`${b.x},${b.y}`) ?? 0) - (distances.get(`${a.x},${a.y}`) ?? 0)
    );
    const portal = reachable[0] ?? { x: this.width - 2, y: this.height - 2 };
    this.portalPos = { ...portal };
    this.grid[portal.y][portal.x] = TILE_TYPES.PORTAL;

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
    const objectiveCandidates = shuffle(reachable.filter(({ x, y }) =>
      this.grid[y][x] === TILE_TYPES.PATH
    )).sort((a, b) =>
      (distances.get(`${a.x},${a.y}`) ?? 0) - (distances.get(`${b.x},${b.y}`) ?? 0)
    );

    // Spread points of interest along the route instead of clustering them near spawn.
    for (let i = 0; i < specials.length && objectiveCandidates.length > 0; i++) {
      const index = Math.min(
        objectiveCandidates.length - 1,
        Math.floor(((i + 1) / (specials.length + 1)) * objectiveCandidates.length)
      );
      const [cell] = objectiveCandidates.splice(index, 1);
      if (cell && this.grid[cell.y][cell.x] === TILE_TYPES.PATH) {
        this.grid[cell.y][cell.x] = specials[i];
      }
    }

    // Security gates are placed only on newly added cross-links, making them optional
    // shortcuts rather than accidental blockers on the level's only route.
    const doorCandidates = shuffle(loopCells.filter(({ x, y }) =>
      this.grid[y][x] === TILE_TYPES.PATH
    ));
    const doorCount = Math.min(3, Math.max(1, Math.floor(loopCells.length / 4)));
    for (const cell of doorCandidates.slice(0, doorCount)) {
      this.grid[cell.y][cell.x] = TILE_TYPES.DOOR;
    }

    this.markExplored(startX, startY);
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
