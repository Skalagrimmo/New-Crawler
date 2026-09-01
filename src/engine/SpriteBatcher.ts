import { AssetManager } from './AssetManager';
import { RenderableSprite, SpriteBatch } from './types';

export interface BatchStats {
  totalSprites: number;
  drawCalls: number;
  batchesCount: number;
  textureSwitches: number;
  efficiencyPercent: number;
  vertexCount: number;
}

/**
 * High-Performance Pascal-Inspired 2D Sprite Batching Engine (TSpriteBatcher)
 * Groups draw calls by texture and blend mode, minimizing CPU-to-GPU state swaps.
 */
export class SpriteBatcher {
  private assetManager: AssetManager;
  private spriteQueue: RenderableSprite[] = [];
  private batches: SpriteBatch[] = [];
  private stats: BatchStats = {
    totalSprites: 0,
    drawCalls: 0,
    batchesCount: 0,
    textureSwitches: 0,
    efficiencyPercent: 100,
    vertexCount: 0,
  };
  private maxBatchCapacity: number = 2048;

  constructor(assetManager: AssetManager, capacity = 2048) {
    this.assetManager = assetManager;
    this.maxBatchCapacity = capacity;
  }

  public setCapacity(capacity: number) {
    this.maxBatchCapacity = capacity;
  }

  public getStats(): BatchStats {
    return { ...this.stats };
  }

  public getBatches(): SpriteBatch[] {
    return [...this.batches];
  }

  public clear() {
    this.spriteQueue.length = 0;
    this.batches.length = 0;
  }

  public queueSprite(sprite: RenderableSprite) {
    if (this.spriteQueue.length < this.maxBatchCapacity) {
      this.spriteQueue.push(sprite);
    }
  }

  public queueNamedSprite(
    spriteId: string,
    destX: number,
    destY: number,
    width = 32,
    height = 32,
    options: Partial<RenderableSprite> = {}
  ) {
    const def = this.assetManager.getSpriteDef(spriteId);
    if (!def) {
      // Fallback
      const fallbackDef = {
        id: 'fallback',
        textureId: 'fallback_wireframe',
        frame: { x: 0, y: 0, w: 32, h: 32, anchorX: 0.5, anchorY: 0.5 },
      };
      this.queueSprite({
        id: `sprite_${this.spriteQueue.length}`,
        textureId: fallbackDef.textureId,
        sourceRect: fallbackDef.frame,
        destX,
        destY,
        width,
        height,
        rotation: options.rotation || 0,
        scaleX: options.scaleX || 1,
        scaleY: options.scaleY || 1,
        tint: options.tint || '#ffffff',
        alpha: options.alpha !== undefined ? options.alpha : 1,
        blendMode: options.blendMode || 'source-over',
        zIndex: options.zIndex || 0,
      });
      return;
    }

    this.queueSprite({
      id: `sprite_${this.spriteQueue.length}`,
      textureId: def.textureId,
      sourceRect: def.frame,
      destX,
      destY,
      width,
      height,
      rotation: options.rotation || 0,
      scaleX: options.scaleX || 1,
      scaleY: options.scaleY || 1,
      tint: options.tint || '#ffffff',
      alpha: options.alpha !== undefined ? options.alpha : 1,
      blendMode: options.blendMode || 'source-over',
      zIndex: options.zIndex || 0,
    });
  }

  /**
   * Sorts and compiles the sprite queue into optimized batches by zIndex, textureId, and blendMode.
   */
  public compileBatches(): SpriteBatch[] {
    if (this.spriteQueue.length === 0) {
      this.batches = [];
      this.stats = {
        totalSprites: 0,
        drawCalls: 0,
        batchesCount: 0,
        textureSwitches: 0,
        efficiencyPercent: 100,
        vertexCount: 0,
      };
      return [];
    }

    // Stable sort: primary key = zIndex, secondary key = textureId, tertiary = blendMode
    this.spriteQueue.sort((a, b) => {
      if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
      if (a.textureId !== b.textureId) return a.textureId.localeCompare(b.textureId);
      return a.blendMode.localeCompare(b.blendMode);
    });

    this.batches = [];
    let currentBatch: SpriteBatch | null = null;
    let textureSwitches = 0;

    for (const sprite of this.spriteQueue) {
      if (
        !currentBatch ||
        currentBatch.textureId !== sprite.textureId ||
        currentBatch.blendMode !== sprite.blendMode
      ) {
        if (currentBatch && currentBatch.textureId !== sprite.textureId) {
          textureSwitches++;
        }
        currentBatch = {
          textureId: sprite.textureId,
          blendMode: sprite.blendMode,
          sprites: [sprite],
          drawCalls: 1,
        };
        this.batches.push(currentBatch);
      } else {
        currentBatch.sprites.push(sprite);
      }
    }

    const totalSprites = this.spriteQueue.length;
    const drawCalls = this.batches.length;
    const rawCallsWithoutBatching = totalSprites;
    const savedCalls = Math.max(0, rawCallsWithoutBatching - drawCalls);
    const efficiencyPercent = rawCallsWithoutBatching > 0
      ? Math.round((savedCalls / rawCallsWithoutBatching) * 100)
      : 100;

    this.stats = {
      totalSprites,
      drawCalls,
      batchesCount: this.batches.length,
      textureSwitches,
      efficiencyPercent,
      vertexCount: totalSprites * 4,
    };

    return this.batches;
  }

  /**
   * Executes the compiled batches onto the destination Canvas 2D context.
   */
  public render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    zoom = 1,
    canvasWidth = 640,
    canvasHeight = 480
  ) {
    this.compileBatches();

    ctx.save();
    // Center camera
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-cameraX, -cameraY);

    for (const batch of this.batches) {
      const texture = this.assetManager.getTexture(batch.textureId);
      if (!texture) continue;

      ctx.globalCompositeOperation = batch.blendMode;

      for (const sprite of batch.sprites) {
        ctx.save();
        ctx.globalAlpha = sprite.alpha;

        const posX = sprite.destX;
        const posY = sprite.destY;

        ctx.translate(posX, posY);
        if (sprite.rotation !== 0) {
          ctx.rotate(sprite.rotation);
        }
        if (sprite.scaleX !== 1 || sprite.scaleY !== 1) {
          ctx.scale(sprite.scaleX, sprite.scaleY);
        }

        const src = sprite.sourceRect;
        const drawW = sprite.width;
        const drawH = sprite.height;
        const offsetX = -drawW * (src.anchorX ?? 0.5);
        const offsetY = -drawH * (src.anchorY ?? 0.5);

        ctx.drawImage(
          texture.canvas,
          src.x,
          src.y,
          src.w,
          src.h,
          offsetX,
          offsetY,
          drawW,
          drawH
        );

        ctx.restore();
      }
    }

    ctx.restore();
  }
}
