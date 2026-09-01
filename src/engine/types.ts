export interface TextureAsset {
  id: string;
  name: string;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  memoryBytes: number;
  lastUsedTimestamp: number;
  refCount: number;
  isAtlas?: boolean;
  isFallback?: boolean;
  sourceUrl?: string;
  tags?: string[];
}

export interface SpriteFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  anchorX: number;
  anchorY: number;
}

export interface SpriteDefinition {
  id: string;
  textureId: string;
  frame: SpriteFrame;
  animations?: Record<string, SpriteFrame[]>;
}

export interface RenderableSprite {
  id: string;
  textureId: string;
  sourceRect: SpriteFrame;
  destX: number;
  destY: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  tint: string;
  alpha: number;
  blendMode: GlobalCompositeOperation;
  zIndex: number;
}

export interface SpriteBatch {
  textureId: string;
  blendMode: GlobalCompositeOperation;
  sprites: RenderableSprite[];
  drawCalls: number;
}

export interface MemoryBudget {
  maxTextureMemoryBytes: number;
  currentTextureMemoryBytes: number;
  allocatedTexturesCount: number;
  evictionCount: number;
  fallbackCount: number;
  peakMemoryBytes: number;
}

export type PlatformTarget = 'android' | 'ios' | 'desktop' | 'raspberry_pi';

export interface PlatformConfig {
  id: PlatformTarget;
  name: string;
  description: string;
  maxMemoryMB: number;
  targetFPS: number;
  batchCapacity: number;
  particleLimit: number;
  enableCRTShader: boolean;
  enableHaptics: boolean;
  touchControllerStyle: 'joystick' | 'dpad' | 'gestures_only';
  inputPollingRateHz: number;
  textureFilter: 'nearest' | 'linear';
}

export interface ProfilerStats {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  spritesRendered: number;
  batchesCount: number;
  textureSwitches: number;
  inputLatencyMs: number;
  memoryUsedMB: number;
  memoryMaxMB: number;
  hapticsTriggered: number;
  activeParticles: number;
}

export type HapticType = 
  | 'light_tap' 
  | 'step'
  | 'attack' 
  | 'damage' 
  | 'critical' 
  | 'hack_success' 
  | 'hack_fail' 
  | 'level_up' 
  | 'boss_alert'
  | 'explosion';

export interface TouchGestureState {
  isTouchActive: boolean;
  joystickActive: boolean;
  joystickVector: { x: number; y: number };
  lastTapTimestamp: number;
  lastSwipeDirection: 'up' | 'down' | 'left' | 'right' | null;
  pinchDistance: number;
  zoomScale: number;
}
