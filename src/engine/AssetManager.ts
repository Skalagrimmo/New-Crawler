import { MemoryBudget, SpriteDefinition, SpriteFrame, TextureAsset } from './types';

export type AssetEventType = 'loaded' | 'error' | 'evicted' | 'fallback' | 'memory_warning';

export interface AssetLogEvent {
  id: string;
  timestamp: number;
  type: AssetEventType;
  assetId: string;
  message: string;
}

/**
 * Pascal-inspired Modular Asset Manager (TAssetManager Unit)
 * Independent of game logic, with LRU memory caching, procedural atlas generation,
 * texture pooling, and robust error recovery fallbacks.
 */
export class AssetManager {
  private textures: Map<string, TextureAsset> = new Map();
  private spriteDefs: Map<string, SpriteDefinition> = new Map();
  private maxMemoryBytes: number = 48 * 1024 * 1024; // 48MB default
  private currentMemoryBytes: number = 0;
  private evictionCount: number = 0;
  private fallbackCount: number = 0;
  private peakMemoryBytes: number = 0;
  private eventLogs: AssetLogEvent[] = [];
  private listeners: Array<(budget: MemoryBudget) => void> = [];

  constructor(maxMemoryMB = 48) {
    this.maxMemoryBytes = maxMemoryMB * 1024 * 1024;
    this.initCoreAtlas();
  }

  public setMaxMemoryMB(mb: number) {
    this.maxMemoryBytes = mb * 1024 * 1024;
    this.enforceMemoryBudget();
    this.notifyListeners();
  }

  public getMemoryBudget(): MemoryBudget {
    return {
      maxTextureMemoryBytes: this.maxMemoryBytes,
      currentTextureMemoryBytes: this.currentMemoryBytes,
      allocatedTexturesCount: this.textures.size,
      evictionCount: this.evictionCount,
      fallbackCount: this.fallbackCount,
      peakMemoryBytes: this.peakMemoryBytes,
    };
  }

  public getLogs(): AssetLogEvent[] {
    return [...this.eventLogs];
  }

  public getAllTextures(): TextureAsset[] {
    return Array.from(this.textures.values());
  }

  public getSpriteDef(spriteId: string): SpriteDefinition | undefined {
    return this.spriteDefs.get(spriteId);
  }

  public getTexture(id: string): TextureAsset | undefined {
    const tex = this.textures.get(id);
    if (tex) {
      tex.lastUsedTimestamp = performance.now();
      return tex;
    }
    // Return or generate fallback
    return this.getFallbackTexture(id);
  }

  public registerSprite(id: string, textureId: string, frame: SpriteFrame) {
    this.spriteDefs.set(id, { id, textureId, frame });
  }

  public createProceduralTexture(
    id: string,
    name: string,
    width: number,
    height: number,
    renderFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    tags: string[] = []
  ): TextureAsset {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: false })!;
    ctx.imageSmoothingEnabled = false;

    renderFn(ctx, width, height);

    const memoryBytes = width * height * 4; // 4 bytes per RGBA pixel
    const texture: TextureAsset = {
      id,
      name,
      width,
      height,
      canvas,
      ctx,
      memoryBytes,
      lastUsedTimestamp: performance.now(),
      refCount: 1,
      isAtlas: false,
      tags,
    };

    this.allocateTexture(texture);
    this.logEvent('loaded', id, `Procedural texture created: ${name} (${width}x${height}, ${(memoryBytes / 1024).toFixed(1)} KB)`);
    return texture;
  }

  private allocateTexture(texture: TextureAsset) {
    // If texture exists, update memory difference
    if (this.textures.has(texture.id)) {
      const old = this.textures.get(texture.id)!;
      this.currentMemoryBytes -= old.memoryBytes;
    }

    this.currentMemoryBytes += texture.memoryBytes;
    if (this.currentMemoryBytes > this.peakMemoryBytes) {
      this.peakMemoryBytes = this.currentMemoryBytes;
    }

    this.textures.set(texture.id, texture);
    this.enforceMemoryBudget();
    this.notifyListeners();
  }

  private enforceMemoryBudget() {
    if (this.currentMemoryBytes <= this.maxMemoryBytes) return;

    // LRU eviction of textures that are not core atlas and have refCount <= 1
    const evictable = Array.from(this.textures.values())
      .filter((t) => !t.isAtlas && !t.isFallback && t.id !== 'core_atlas')
      .sort((a, b) => a.lastUsedTimestamp - b.lastUsedTimestamp);

    for (const item of evictable) {
      if (this.currentMemoryBytes <= this.maxMemoryBytes) break;
      this.textures.delete(item.id);
      this.currentMemoryBytes -= item.memoryBytes;
      this.evictionCount++;
      this.logEvent('evicted', item.id, `LRU Evicted texture: ${item.name} to free memory`);
    }

    if (this.currentMemoryBytes > this.maxMemoryBytes) {
      this.logEvent('memory_warning', 'system', `Memory budget exceeded (${(this.currentMemoryBytes / (1024 * 1024)).toFixed(2)} MB / ${(this.maxMemoryBytes / (1024 * 1024)).toFixed(2)} MB)`);
    }
  }

  public getFallbackTexture(failedAssetId: string): TextureAsset {
    const fallbackId = 'fallback_wireframe';
    if (this.textures.has(fallbackId)) {
      this.fallbackCount++;
      this.logEvent('fallback', failedAssetId, `Fallback texture substituted for missing: ${failedAssetId}`);
      return this.textures.get(fallbackId)!;
    }

    // Create 32x32 error checkerboard texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // High-visibility Cyberpunk Magenta / Black error pattern
    ctx.fillStyle = '#050807';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#ff007f';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillRect(16, 16, 16, 16);
    ctx.strokeStyle = '#3dffa0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, 31, 31);
    ctx.fillStyle = '#3dffa0';
    ctx.font = '9px monospace';
    ctx.fillText('ERR', 7, 20);

    const fallbackTex: TextureAsset = {
      id: fallbackId,
      name: 'System Fallback Error Texture',
      width: 32,
      height: 32,
      canvas,
      ctx,
      memoryBytes: 32 * 32 * 4,
      lastUsedTimestamp: performance.now(),
      refCount: 999,
      isFallback: true,
      tags: ['system', 'fallback'],
    };

    this.textures.set(fallbackId, fallbackTex);
    this.currentMemoryBytes += fallbackTex.memoryBytes;
    this.fallbackCount++;
    this.logEvent('fallback', failedAssetId, `Created & substituted fallback for: ${failedAssetId}`);
    this.notifyListeners();
    return fallbackTex;
  }

  /**
   * Generates the Master Cyberpunk Pixel Atlas containing all game entities, tiles,
   * bosses, weapons, terminals, and effects in a unified 512x512 sprite sheet.
   */
  private initCoreAtlas() {
    const atlasSize = 512;
    const canvas = document.createElement('canvas');
    canvas.width = atlasSize;
    canvas.height = atlasSize;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Clear background
    ctx.clearRect(0, 0, atlasSize, atlasSize);

    // Grid tile size = 32x32
    const tileSize = 32;

    // DRAW TILES & ENTITIES ON ATLAS

    // (0,0): Floor / Path Tile
    this.drawFloorTile(ctx, 0 * tileSize, 0 * tileSize);
    this.registerSprite('tile_path', 'core_atlas', { x: 0, y: 0, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (1,0): Wall Tile (Neon Cyberpunk Barrier)
    this.drawWallTile(ctx, 1 * tileSize, 0 * tileSize);
    this.registerSprite('tile_wall', 'core_atlas', { x: 32, y: 0, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (2,0): Safe Zone Tile
    this.drawSafeTile(ctx, 2 * tileSize, 0 * tileSize);
    this.registerSprite('tile_safe', 'core_atlas', { x: 64, y: 0, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (3,0): Terminal / Data Console
    this.drawTerminalTile(ctx, 3 * tileSize, 0 * tileSize);
    this.registerSprite('tile_terminal', 'core_atlas', { x: 96, y: 0, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (4,0): Locked Door / Gate
    this.drawDoorTile(ctx, 4 * tileSize, 0 * tileSize);
    this.registerSprite('tile_door', 'core_atlas', { x: 128, y: 0, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (5,0): Encrypted Portal / Boss Gate
    this.drawPortalTile(ctx, 5 * tileSize, 0 * tileSize);
    this.registerSprite('tile_portal', 'core_atlas', { x: 160, y: 0, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (6,0): Balcony / Elevated platform
    this.drawBalconyTile(ctx, 6 * tileSize, 0 * tileSize);
    this.registerSprite('tile_balcony', 'core_atlas', { x: 192, y: 0, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (7,0): Secret Cache
    this.drawCacheTile(ctx, 7 * tileSize, 0 * tileSize);
    this.registerSprite('tile_cache', 'core_atlas', { x: 224, y: 0, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (0,1): Player Netrunner Character
    this.drawPlayerNetrunner(ctx, 0 * tileSize, 1 * tileSize);
    this.registerSprite('player_netrunner', 'core_atlas', { x: 0, y: 32, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (1,1): Player Samurai Character
    this.drawPlayerSamurai(ctx, 1 * tileSize, 1 * tileSize);
    this.registerSprite('player_samurai', 'core_atlas', { x: 32, y: 32, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (2,1): Player Techie Character
    this.drawPlayerTechie(ctx, 2 * tileSize, 1 * tileSize);
    this.registerSprite('player_techie', 'core_atlas', { x: 64, y: 32, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (3,1): Enemy Security Drone
    this.drawEnemyDrone(ctx, 3 * tileSize, 1 * tileSize);
    this.registerSprite('enemy_drone', 'core_atlas', { x: 96, y: 32, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (4,1): Enemy ICE Sentinel
    this.drawEnemySentinel(ctx, 4 * tileSize, 1 * tileSize);
    this.registerSprite('enemy_sentinel', 'core_atlas', { x: 128, y: 32, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (5,1): Enemy Daemon Virus
    this.drawEnemyDaemon(ctx, 5 * tileSize, 1 * tileSize);
    this.registerSprite('enemy_daemon', 'core_atlas', { x: 160, y: 32, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (6,1)-(7,2): Boss 64x64 sprite (Firewall Sentinel / Colossus)
    this.drawBossSprite(ctx, 6 * tileSize, 1 * tileSize);
    this.registerSprite('boss_colossus', 'core_atlas', { x: 192, y: 32, w: 64, h: 64, anchorX: 0.5, anchorY: 0.5 });

    // (0,2): Item NanoMed
    this.drawItemNanoMed(ctx, 0 * tileSize, 2 * tileSize);
    this.registerSprite('item_nanomed', 'core_atlas', { x: 0, y: 64, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (1,2): Item RAMBoost
    this.drawItemRAMBoost(ctx, 1 * tileSize, 2 * tileSize);
    this.registerSprite('item_ramboost', 'core_atlas', { x: 32, y: 64, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (2,2): Item Decryptor / Credit Chip
    this.drawItemCredit(ctx, 2 * tileSize, 2 * tileSize);
    this.registerSprite('item_credits', 'core_atlas', { x: 64, y: 64, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (3,2): Item Weapon / Sparksteel Dagger
    this.drawItemWeapon(ctx, 3 * tileSize, 2 * tileSize);
    this.registerSprite('item_weapon', 'core_atlas', { x: 96, y: 64, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (4,2): Item Keycard / Token
    this.drawItemKeycard(ctx, 4 * tileSize, 2 * tileSize);
    this.registerSprite('item_keycard', 'core_atlas', { x: 128, y: 64, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    // (5,2): Particle Spark / Glow
    this.drawParticleSpark(ctx, 5 * tileSize, 2 * tileSize);
    this.registerSprite('particle_spark', 'core_atlas', { x: 160, y: 64, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 });

    const memoryBytes = atlasSize * atlasSize * 4;
    const atlasTex: TextureAsset = {
      id: 'core_atlas',
      name: 'NetCrawler Master Sprite Atlas',
      width: atlasSize,
      height: atlasSize,
      canvas,
      ctx,
      memoryBytes,
      lastUsedTimestamp: performance.now(),
      refCount: 999,
      isAtlas: true,
      tags: ['core', 'atlas', 'sprites'],
    };

    this.textures.set('core_atlas', atlasTex);
    this.currentMemoryBytes += memoryBytes;
    this.peakMemoryBytes = this.currentMemoryBytes;
    this.logEvent('loaded', 'core_atlas', `Master Atlas loaded (512x512, ${(memoryBytes / 1024).toFixed(1)} KB)`);
  }

  // --- SPRITE PROCEDURAL DRAWING UTILS ---
  private drawFloorTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#08120e';
    ctx.fillRect(x, y, 32, 32);
    ctx.strokeStyle = '#12261f';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, 31, 31);
    ctx.fillStyle = '#1c3b30';
    ctx.fillRect(x + 15, y + 15, 2, 2);
  }

  private drawWallTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#0d1d17';
    ctx.fillRect(x, y, 32, 32);
    ctx.strokeStyle = '#3dffa0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 2.5, y + 2.5, 27, 27);
    ctx.fillStyle = '#1f7a52';
    ctx.fillRect(x + 6, y + 6, 20, 20);
    ctx.fillStyle = '#5ecbff';
    ctx.fillRect(x + 10, y + 10, 12, 12);
  }

  private drawSafeTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#062016';
    ctx.fillRect(x, y, 32, 32);
    ctx.strokeStyle = '#3dffa0';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 1, 30, 30);
    ctx.fillStyle = '#3dffa0';
    ctx.beginPath();
    ctx.arc(x + 16, y + 16, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#062016';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('S', x + 13, y + 20);
  }

  private drawTerminalTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#0a1622';
    ctx.fillRect(x, y, 32, 32);
    ctx.strokeStyle = '#5ecbff';
    ctx.strokeRect(x + 3.5, y + 3.5, 25, 25);
    ctx.fillStyle = '#1c5a8a';
    ctx.fillRect(x + 6, y + 6, 20, 14);
    ctx.fillStyle = '#5ecbff';
    ctx.fillRect(x + 8, y + 9, 6, 2);
    ctx.fillRect(x + 8, y + 13, 12, 2);
    ctx.fillStyle = '#ffb454';
    ctx.fillRect(x + 10, y + 22, 12, 4);
  }

  private drawDoorTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#220a0a';
    ctx.fillRect(x, y, 32, 32);
    ctx.strokeStyle = '#ff5d5d';
    ctx.strokeRect(x + 1.5, y + 1.5, 29, 29);
    ctx.fillStyle = '#7a1f1f';
    ctx.fillRect(x + 4, y + 4, 24, 24);
    ctx.fillStyle = '#ff5d5d';
    ctx.fillRect(x + 14, y + 8, 4, 16);
  }

  private drawPortalTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#1a0820';
    ctx.fillRect(x, y, 32, 32);
    ctx.strokeStyle = '#c792ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 2, y + 2, 28, 28);
    ctx.fillStyle = '#c792ff';
    ctx.beginPath();
    ctx.arc(x + 16, y + 16, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + 16, y + 16, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBalconyTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#141420';
    ctx.fillRect(x, y, 32, 32);
    ctx.strokeStyle = '#5ecbff';
    ctx.strokeRect(x + 2, y + 2, 28, 28);
    ctx.fillStyle = '#ffb454';
    ctx.fillRect(x + 6, y + 6, 20, 3);
    ctx.fillRect(x + 6, y + 23, 20, 3);
  }

  private drawCacheTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#201806';
    ctx.fillRect(x, y, 32, 32);
    ctx.strokeStyle = '#ffb454';
    ctx.strokeRect(x + 2, y + 2, 28, 28);
    ctx.fillStyle = '#ffb454';
    ctx.fillRect(x + 8, y + 10, 16, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 14, y + 8, 4, 3);
  }

  private drawPlayerNetrunner(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#3dffa0';
    ctx.beginPath();
    ctx.arc(x + 16, y + 16, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#050807';
    ctx.fillRect(x + 11, y + 13, 10, 3);
    ctx.fillStyle = '#5ecbff';
    ctx.fillRect(x + 13, y + 14, 3, 2);
    ctx.fillRect(x + 18, y + 14, 3, 2);
  }

  private drawPlayerSamurai(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#ff5d5d';
    ctx.beginPath();
    ctx.arc(x + 16, y + 16, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 10, y + 12, 12, 4);
    ctx.strokeStyle = '#ffb454';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 8);
    ctx.lineTo(x + 28, y + 22);
    ctx.stroke();
  }

  private drawPlayerTechie(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#ffb454';
    ctx.beginPath();
    ctx.arc(x + 16, y + 16, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c5a8a';
    ctx.fillRect(x + 9, y + 12, 14, 5);
  }

  private drawEnemyDrone(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#ff5d5d';
    ctx.fillRect(x + 8, y + 8, 16, 16);
    ctx.fillStyle = '#ffb454';
    ctx.fillRect(x + 12, y + 12, 8, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 14, y + 14, 4, 4);
  }

  private drawEnemySentinel(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#7a1f6e';
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 4);
    ctx.lineTo(x + 28, y + 26);
    ctx.lineTo(x + 4, y + 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c792ff';
    ctx.fillRect(x + 13, y + 15, 6, 6);
  }

  private drawEnemyDaemon(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#ff007f';
    ctx.beginPath();
    ctx.arc(x + 16, y + 16, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#050807';
    ctx.fillRect(x + 10, y + 12, 4, 4);
    ctx.fillRect(x + 18, y + 12, 4, 4);
    ctx.fillRect(x + 12, y + 20, 8, 3);
  }

  private drawBossSprite(ctx: CanvasRenderingContext2D, x: number, y: number) {
    // 64x64 Boss Colossus
    ctx.fillStyle = '#3a0820';
    ctx.fillRect(x, y, 64, 64);
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 2, y + 2, 60, 60);

    ctx.fillStyle = '#ff5d5d';
    ctx.beginPath();
    ctx.arc(x + 32, y + 32, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#c792ff';
    ctx.fillRect(x + 18, y + 22, 28, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 24, y + 24, 6, 4);
    ctx.fillRect(x + 34, y + 24, 6, 4);

    ctx.fillStyle = '#ffb454';
    ctx.fillRect(x + 22, y + 38, 20, 6);
  }

  private drawItemNanoMed(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#0a2216';
    ctx.fillRect(x + 4, y + 4, 24, 24);
    ctx.fillStyle = '#3dffa0';
    ctx.fillRect(x + 13, y + 8, 6, 16);
    ctx.fillRect(x + 8, y + 13, 16, 6);
  }

  private drawItemRAMBoost(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#1c0a22';
    ctx.fillRect(x + 4, y + 4, 24, 24);
    ctx.fillStyle = '#c792ff';
    ctx.fillRect(x + 8, y + 8, 16, 16);
    ctx.fillStyle = '#5ecbff';
    ctx.fillRect(x + 12, y + 12, 8, 8);
  }

  private drawItemCredit(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#ffb454';
    ctx.beginPath();
    ctx.arc(x + 16, y + 16, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#050807';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('$', x + 13, y + 20);
  }

  private drawItemWeapon(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#050807';
    ctx.fillRect(x + 4, y + 4, 24, 24);
    ctx.strokeStyle = '#5ecbff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 24);
    ctx.lineTo(x + 24, y + 8);
    ctx.stroke();
    ctx.fillStyle = '#ffb454';
    ctx.fillRect(x + 7, y + 22, 5, 5);
  }

  private drawItemKeycard(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#5ecbff';
    ctx.fillRect(x + 6, y + 8, 20, 16);
    ctx.fillStyle = '#050807';
    ctx.fillRect(x + 8, y + 12, 6, 8);
    ctx.fillStyle = '#ffb454';
    ctx.fillRect(x + 16, y + 12, 8, 3);
  }

  private drawParticleSpark(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + 16, y + 16, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3dffa0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 6);
    ctx.lineTo(x + 16, y + 26);
    ctx.moveTo(x + 6, y + 16);
    ctx.lineTo(x + 26, y + 16);
    ctx.stroke();
  }

  public subscribe(fn: (budget: MemoryBudget) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notifyListeners() {
    const budget = this.getMemoryBudget();
    for (const listener of this.listeners) {
      listener(budget);
    }
  }

  private logEvent(type: AssetEventType, assetId: string, message: string) {
    const entry: AssetLogEvent = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: performance.now(),
      type,
      assetId,
      message,
    };
    this.eventLogs.unshift(entry);
    if (this.eventLogs.length > 50) {
      this.eventLogs.pop();
    }
  }
}

export const assetManager = new AssetManager(48);
