import { SpriteBatcher } from './SpriteBatcher';

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  vRot: number;
  spriteId?: string;
}

/**
 * High-Performance Object-Pooled Particle Engine (TParticleEmitter)
 * Allocates a fixed pool up front to prevent garbage collector pauses.
 */
export class ParticleEngine {
  private pool: Particle[] = [];
  private poolSize: number;
  private activeCount: number = 0;

  constructor(maxParticles = 500) {
    this.poolSize = maxParticles;
    for (let i = 0; i < maxParticles; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 2,
        color: '#3dffa0',
        alpha: 1,
        rotation: 0,
        vRot: 0,
      });
    }
  }

  public setCapacity(capacity: number) {
    this.poolSize = capacity;
    while (this.pool.length < capacity) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 2,
        color: '#3dffa0',
        alpha: 1,
        rotation: 0,
        vRot: 0,
      });
    }
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public emit(
    x: number,
    y: number,
    count = 10,
    color = '#3dffa0',
    speed = 60,
    life = 0.5,
    size = 3,
    spriteId?: string
  ) {
    let spawned = 0;
    for (let i = 0; i < this.poolSize && spawned < count; i++) {
      const p = this.pool[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        const angle = Math.random() * Math.PI * 2;
        const spd = (Math.random() * 0.7 + 0.3) * speed;
        p.vx = Math.cos(angle) * spd;
        p.vy = Math.sin(angle) * spd;
        p.life = life * (Math.random() * 0.4 + 0.8);
        p.maxLife = p.life;
        p.size = size;
        p.color = color;
        p.alpha = 1;
        p.rotation = Math.random() * Math.PI * 2;
        p.vRot = (Math.random() - 0.5) * 8;
        p.spriteId = spriteId;
        spawned++;
      }
    }
  }

  public update(dt: number) {
    let count = 0;
    for (let i = 0; i < this.poolSize; i++) {
      const p = this.pool[i];
      if (p.active) {
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.95; // drag
          p.vy *= 0.95;
          p.rotation += p.vRot * dt;
          p.alpha = p.life / p.maxLife;
          count++;
        }
      }
    }
    this.activeCount = count;
  }

  public render(batcher: SpriteBatcher) {
    for (let i = 0; i < this.poolSize; i++) {
      const p = this.pool[i];
      if (p.active) {
        batcher.queueNamedSprite('particle_spark', p.x, p.y, p.size * 4, p.size * 4, {
          alpha: p.alpha,
          rotation: p.rotation,
          tint: p.color,
          blendMode: 'lighter',
          zIndex: 100,
        });
      }
    }
  }

  public clear() {
    for (let i = 0; i < this.poolSize; i++) {
      this.pool[i].active = false;
    }
    this.activeCount = 0;
  }
}
