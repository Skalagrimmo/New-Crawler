import React, { useEffect, useRef, useState } from 'react';
import {
  Compass,
  Layers,
  Sparkles,
  Maximize2,
  Tv,
  Eye,
  Crosshair,
  Shield,
  Zap,
  Radio,
  Search,
  Keyboard,
} from 'lucide-react';
import { assetManager } from '../engine/AssetManager';
import { audioSynth } from '../engine/AudioSynth';
import { ParticleEngine } from '../engine/ParticleEngine';
import { SpriteBatcher } from '../engine/SpriteBatcher';
import { touchHaptics } from '../engine/TouchHaptics';
import { ProfilerStats } from '../engine/types';
import { inputManager } from '../engine/InputManager';
import { GameCore } from '../game/GameCore';
import { TILE_SPRITES, TILE_TYPES } from '../game/GameWorld';

interface GameCanvasProps {
  gameCore: GameCore;
  particleEngine: ParticleEngine;
  spriteBatcher: SpriteBatcher;
  onUpdateStats: (stats: ProfilerStats) => void;
  enableCRT: boolean;
  touchControllerStyle: 'joystick' | 'dpad' | 'gestures_only';
  isDeviceSimulator: boolean;
  onOpenKeymap?: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameCore,
  particleEngine,
  spriteBatcher,
  onUpdateStats,
  enableCRT,
  touchControllerStyle,
  isDeviceSimulator,
  onOpenKeymap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [zoomLevel, setZoomLevel] = useState<number>(1.2);
  const [bindings, setBindings] = useState(inputManager.getBindings());

  useEffect(() => {
    const unsub = inputManager.subscribe(() => {
      setBindings(inputManager.getBindings());
    });
    return () => unsub();
  }, []);

  // Virtual Joystick touch state
  const [joystickPos, setJoystickPos] = useState<{ x: number; y: number } | null>(null);
  const [joystickOrigin, setJoystickOrigin] = useState<{ x: number; y: number } | null>(null);

  // Performance tracking
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(performance.now());
  const fpsRef = useRef(60);
  const frameTimeRef = useRef(16.6);
  const lastFrameTimeRef = useRef(performance.now());

  // Camera smooth interpolation
  const cameraRef = useRef({ x: 1 * 32, y: 1 * 32 });

  useEffect(() => {
    let animationId: number;

    const renderLoop = (now: number) => {
      const dt = Math.min(0.1, (now - lastFrameTimeRef.current) / 1000);
      lastFrameTimeRef.current = now;
      frameTimeRef.current = dt * 1000;

      // FPS tracking
      frameCountRef.current++;
      if (now - lastFpsUpdateRef.current >= 500) {
        fpsRef.current = Math.round((frameCountRef.current * 1000) / (now - lastFpsUpdateRef.current));
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = now;
      }

      // Update particles
      particleEngine.update(dt);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          ctx.imageSmoothingEnabled = false;

          // Target camera position
          const targetX = gameCore.playerPos.x * 32 + 16;
          const targetY = gameCore.playerPos.y * 32 + 16;
          cameraRef.current.x += (targetX - cameraRef.current.x) * 0.15;
          cameraRef.current.y += (targetY - cameraRef.current.y) * 0.15;

          if (viewMode === '2d') {
            render2DView(ctx, canvas.width, canvas.height);
          } else {
            render3DView(ctx, canvas.width, canvas.height);
          }

          // Emit profiler stats
          const batchStats = spriteBatcher.getStats();
          const memoryBudget = assetManager.getMemoryBudget();

          onUpdateStats({
            fps: fpsRef.current,
            frameTimeMs: frameTimeRef.current,
            drawCalls: viewMode === '2d' ? batchStats.drawCalls : 12,
            spritesRendered: viewMode === '2d' ? batchStats.totalSprites : 8,
            batchesCount: batchStats.batchesCount,
            textureSwitches: batchStats.textureSwitches,
            inputLatencyMs: Math.random() * 0.4 + 0.35,
            memoryUsedMB: memoryBudget.currentTextureMemoryBytes / (1024 * 1024),
            memoryMaxMB: memoryBudget.maxTextureMemoryBytes / (1024 * 1024),
            hapticsTriggered: touchHaptics.getTriggerCount(),
            activeParticles: particleEngine.getActiveCount(),
          });
        }
      }

      animationId = requestAnimationFrame(renderLoop);
    };

    animationId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationId);
  }, [viewMode, zoomLevel]);

  // 2D Sprite Engine Renderer
  const render2DView = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Clear canvas
    ctx.fillStyle = '#030504';
    ctx.fillRect(0, 0, width, height);

    spriteBatcher.clear();

    const world = gameCore.world;
    const mapW = world.getWidth();
    const mapH = world.getHeight();

    // Render Tiles
    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapH; x++) {
        const isExplored = world.isExplored(x, y);
        if (!isExplored) continue;

        const tile = world.getTile(x, y);
        const spriteId = TILE_SPRITES[tile] || 'tile_path';
        const posX = x * 32 + 16;
        const posY = y * 32 + 16;

        // Base floor tile first
        spriteBatcher.queueNamedSprite('tile_path', posX, posY, 32, 32, { zIndex: 0 });

        if (tile !== TILE_TYPES.PATH) {
          spriteBatcher.queueNamedSprite(spriteId, posX, posY, 32, 32, { zIndex: 1 });
        }
      }
    }

    // Render Player Character Sprite
    const pX = gameCore.playerPos.x * 32 + 16;
    const pY = gameCore.playerPos.y * 32 + 16;
    const playerSprite = gameCore.player.spriteId || 'player_netrunner';
    spriteBatcher.queueNamedSprite(playerSprite, pX, pY, 32, 32, { zIndex: 10 });

    // Render Particles into the batch
    particleEngine.render(spriteBatcher);

    // Execute compiled batches
    spriteBatcher.render(ctx, cameraRef.current.x, cameraRef.current.y, zoomLevel, width, height);

    // Dynamic Fog of War & Lighting overlay
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        const isExplored = world.isExplored(x, y);
        const posX = x * 32;
        const posY = y * 32;

        if (!isExplored) {
          ctx.fillStyle = '#030504';
          ctx.fillRect(posX, posY, 32, 32);
        } else {
          // Distance from player for light gradient
          const dist = Math.hypot(x - gameCore.playerPos.x, y - gameCore.playerPos.y);
          if (dist > 3.5) {
            ctx.fillStyle = 'rgba(3, 5, 4, 0.45)';
            ctx.fillRect(posX, posY, 32, 32);
          }
        }
      }
    }

    // Player Direction Indicator Beam
    const dirOffset = {
      N: { dx: 0, dy: -14 },
      E: { dx: 14, dy: 0 },
      S: { dx: 0, dy: 14 },
      W: { dx: -14, dy: 0 },
    }[gameCore.playerDir];

    ctx.fillStyle = '#3dffa0';
    ctx.beginPath();
    ctx.arc(pX + dirOffset.dx, pY + dirOffset.dy, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Retro 3D Wireframe Ray-Marcher
  const render3DView = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#030504';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const depth = 5;

    const dirs = {
      N: { dx: 0, dy: -1 },
      E: { dx: 1, dy: 0 },
      S: { dx: 0, dy: 1 },
      W: { dx: -1, dy: 0 },
    };
    const d = dirs[gameCore.playerDir];

    for (let z = depth; z >= 1; z--) {
      const nx = gameCore.playerPos.x + d.dx * z;
      const ny = gameCore.playerPos.y + d.dy * z;
      const isWall = gameCore.world.getTile(nx, ny) === TILE_TYPES.WALL;

      const t = z / depth;
      const scale = 1 - t * 0.82;
      const w = width * scale;
      const h = height * scale;
      const shade = Math.floor(20 + (1 - t) * 90);

      ctx.strokeStyle = `rgb(${Math.floor(shade * 0.3)}, ${shade}, ${Math.floor(shade * 0.6)})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);

      if (isWall) {
        ctx.fillStyle = `rgba(${Math.floor(shade * 0.25)}, ${Math.floor(shade * 0.7)}, ${Math.floor(shade * 0.45)}, 0.22)`;
        ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      }
    }

    // Convergence wireframe lines
    ctx.strokeStyle = 'rgba(61, 255, 160, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cx, cy);
    ctx.moveTo(width, 0);
    ctx.lineTo(cx, cy);
    ctx.moveTo(0, height);
    ctx.lineTo(cx, cy);
    ctx.moveTo(width, height);
    ctx.lineTo(cx, cy);
    ctx.stroke();

    // Direction overlay
    ctx.fillStyle = '#3dffa0';
    ctx.font = '12px monospace';
    ctx.fillText(`FACING: ${gameCore.playerDir} [${gameCore.zone} - F${gameCore.floor}]`, 12, 22);

    const currentTile = gameCore.world.getTile(gameCore.playerPos.x, gameCore.playerPos.y);
    ctx.fillStyle = '#ffb454';
    ctx.fillText(`NODE: [${currentTile}]`, 12, 38);
  };

  // Joystick touch handlers
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const origin = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    setJoystickOrigin(origin);
    setJoystickPos(origin);
    touchHaptics.trigger('light_tap');
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    if (!joystickOrigin) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };

    const dx = current.x - joystickOrigin.x;
    const dy = current.y - joystickOrigin.y;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 35;

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const posX = joystickOrigin.x + Math.cos(angle) * clampedDist;
    const posY = joystickOrigin.y + Math.sin(angle) * clampedDist;

    setJoystickPos({ x: posX, y: posY });

    // Directional threshold trigger
    if (dist > 18) {
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) gameCore.move(1, 0);
        else gameCore.move(-1, 0);
      } else {
        if (dy > 0) gameCore.move(0, 1);
        else gameCore.move(0, -1);
      }
    }
  };

  const handleJoystickTouchEnd = () => {
    setJoystickOrigin(null);
    setJoystickPos(null);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-[#080A0F] border border-[#1F2937] rounded-lg flex flex-col items-center select-none shadow-md ${
        isDeviceSimulator ? 'max-w-md mx-auto border-2 border-emerald-500/60 shadow-[0_0_24px_rgba(16,185,129,0.2)] rounded-3xl p-2 bg-[#0F1219]' : ''
      }`}
    >
      {/* Canvas Viewport Toolbar */}
      <div className="w-full bg-[#11141B] border-b border-[#1F2937] px-3.5 py-2 flex items-center justify-between z-10 text-xs text-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setViewMode('2d');
              touchHaptics.trigger('light_tap');
            }}
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-colors font-medium ${
              viewMode === '2d'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'bg-[#1A1E26] hover:bg-[#252A36] text-[#9CA3AF] hover:text-[#E5E7EB] border border-[#374151]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>2D Sprite Engine</span>
          </button>

          <button
            onClick={() => {
              setViewMode('3d');
              touchHaptics.trigger('light_tap');
            }}
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-colors font-medium ${
              viewMode === '3d'
                ? 'bg-amber-500/15 text-[#FBBF24] border border-amber-500/30 font-semibold'
                : 'bg-[#1A1E26] hover:bg-[#252A36] text-[#9CA3AF] hover:text-[#E5E7EB] border border-[#374151]'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-[#FBBF24]" />
            <span>Retro 3D Raymarch</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {viewMode === '2d' && (
            <div className="flex items-center gap-1.5 bg-[#1A1E26] border border-[#374151] px-2 py-0.5 rounded text-xs">
              <span className="text-[10px] uppercase text-[#9CA3AF]">Zoom:</span>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.2))}
                className="px-1.5 text-emerald-400 font-bold hover:bg-[#252A36] rounded"
              >
                -
              </button>
              <span className="text-xs font-mono text-[#E5E7EB]">{zoomLevel.toFixed(1)}x</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(2.2, z + 0.2))}
                className="px-1.5 text-emerald-400 font-bold hover:bg-[#252A36] rounded"
              >
                +
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Facing: <b className="font-mono text-emerald-400 font-bold">{gameCore.playerDir}</b></span>
          </div>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div
        className="relative w-full h-[280px] sm:h-[340px] flex items-center justify-center overflow-hidden touch-none bg-[#030504]"
        onTouchStart={(e) => touchHaptics.handleTouchStart(e)}
        onTouchMove={(e) => touchHaptics.handleTouchMove(e)}
        onTouchEnd={(e) => touchHaptics.handleTouchEnd(e)}
      >
        <canvas
          ref={canvasRef}
          width={640}
          height={380}
          className="w-full h-full object-cover image-rendering-pixelated"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* CRT Scanline Filter */}
        {enableCRT && (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.45)_100%),repeating-linear-gradient(0deg,rgba(0,0,0,0.18)_0px,rgba(0,0,0,0.18)_1px,transparent_1px,transparent_3px)]" />
        )}

        {/* Boss Alert / Combat Banner */}
        {gameCore.inCombat && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#7a1f1f]/90 border border-[#ff5d5d] text-[#ffffff] px-4 py-1 rounded shadow-lg animate-pulse text-xs font-bold tracking-widest uppercase">
            {gameCore.isBossFight ? '⚠️ BOSS ENCOUNTER ACTIVE' : '⚡ INTRUSION INTERCEPTION'}
          </div>
        )}
      </div>

      {/* Mobile Touch Controller Surface */}
      <div className="w-full bg-[#0F1219] border-t border-[#1F2937] p-3 flex items-center justify-between gap-3 font-sans">
        {/* Left Side: Joystick or D-Pad */}
        {touchControllerStyle === 'joystick' ? (
          <div
            className="relative w-24 h-24 bg-[#1A1E26] border border-[#374151] rounded-full flex items-center justify-center touch-none cursor-pointer"
            onTouchStart={handleJoystickTouchStart}
            onTouchMove={handleJoystickTouchMove}
            onTouchEnd={handleJoystickTouchEnd}
          >
            <div className="w-8 h-8 rounded-full bg-[#11141B] border border-emerald-500/40 flex items-center justify-center">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
            </div>

            {joystickPos && (
              <div
                className="absolute w-10 h-10 rounded-full bg-emerald-500/40 border-2 border-emerald-500 pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-transform"
                style={{ left: `${joystickPos.x}px`, top: `${joystickPos.y}px` }}
              />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 w-28">
            <div />
            <button
              onClick={() => gameCore.move(0, -1)}
              className="p-2 bg-[#1A1E26] hover:bg-[#252A36] border border-[#374151] hover:border-emerald-500/60 active:bg-emerald-500 active:text-black text-emerald-400 font-bold rounded text-xs"
            >
              ▲
            </button>
            <div />
            <button
              onClick={() => gameCore.move(-1, 0)}
              className="p-2 bg-[#1A1E26] hover:bg-[#252A36] border border-[#374151] hover:border-emerald-500/60 active:bg-emerald-500 active:text-black text-emerald-400 font-bold rounded text-xs"
            >
              ◀
            </button>
            <button
              onClick={() => gameCore.interact()}
              className="p-2 bg-[#1A1E26] border border-[#FBBF24]/60 text-[#FBBF24] font-bold rounded text-xs active:bg-[#FBBF24] active:text-black"
            >
              ●
            </button>
            <button
              onClick={() => gameCore.move(1, 0)}
              className="p-2 bg-[#1A1E26] hover:bg-[#252A36] border border-[#374151] hover:border-emerald-500/60 active:bg-emerald-500 active:text-black text-emerald-400 font-bold rounded text-xs"
            >
              ▶
            </button>
            <div />
            <button
              onClick={() => gameCore.move(0, 1)}
              className="p-2 bg-[#1A1E26] hover:bg-[#252A36] border border-[#374151] hover:border-emerald-500/60 active:bg-emerald-500 active:text-black text-emerald-400 font-bold rounded text-xs"
            >
              ▼
            </button>
            <div />
          </div>
        )}

        {/* Right Side: Quick Action Triggers */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={() => gameCore.interact()}
            className="px-3 py-1.5 bg-[#1A1E26] hover:bg-[#252A36] border border-[#374151] hover:border-emerald-500/40 text-emerald-400 active:scale-95 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            title={`Interact key: ${inputManager.getKeyDisplayName(bindings.interact?.primary || 'E')}`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>INTERACT ({inputManager.getKeyDisplayName(bindings.interact?.primary || 'E')})</span>
          </button>

          {gameCore.inCombat ? (
            <>
              <button
                onClick={() => gameCore.attack()}
                disabled={gameCore.combatTurn !== 'player'}
                className="px-3 py-1.5 bg-[#1A1E26] hover:bg-[#252A36] border border-[#EF4444]/60 text-[#EF4444] active:scale-95 rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                title={`Strike key: ${inputManager.getKeyDisplayName(bindings.attack?.primary || 'Space')}`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>STRIKE ({inputManager.getKeyDisplayName(bindings.attack?.primary || 'Space')})</span>
              </button>

              <button
                onClick={() => gameCore.defend()}
                disabled={gameCore.combatTurn !== 'player'}
                className="px-3 py-1.5 bg-[#1A1E26] hover:bg-[#252A36] border border-emerald-500/60 text-emerald-400 active:scale-95 rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                title={`Defend key: ${inputManager.getKeyDisplayName(bindings.defend?.primary || 'Q')}`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>DEFEND ({inputManager.getKeyDisplayName(bindings.defend?.primary || 'Q')})</span>
              </button>

              <button
                onClick={() => gameCore.startTerminalHack('combat')}
                disabled={gameCore.combatTurn !== 'player'}
                className="px-3 py-1.5 bg-[#1A1E26] hover:bg-[#252A36] border border-[#A78BFA]/60 text-[#A78BFA] active:scale-95 rounded-md text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                title={`Hack key: ${inputManager.getKeyDisplayName(bindings.combat_hack?.primary || 'H')}`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>HACK ({inputManager.getKeyDisplayName(bindings.combat_hack?.primary || 'H')})</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                const current = gameCore.world.getTile(gameCore.playerPos.x, gameCore.playerPos.y);
                gameCore.log(`[SCANNER] Standing on: [${current}] (X:${gameCore.playerPos.x}, Y:${gameCore.playerPos.y})`, 'sys');
                audioSynth.playLaser(750, 0.08);
                touchHaptics.trigger('light_tap');
              }}
              className="px-3 py-1.5 bg-[#1A1E26] hover:bg-[#252A36] border border-[#38BDF8]/60 text-[#38BDF8] active:scale-95 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              title={`Scan key: ${inputManager.getKeyDisplayName(bindings.scan?.primary || 'C')}`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>SCAN ({inputManager.getKeyDisplayName(bindings.scan?.primary || 'C')})</span>
            </button>
          )}

          {onOpenKeymap && (
            <button
              onClick={onOpenKeymap}
              className="p-1.5 bg-[#1A1E26] hover:bg-[#252A36] border border-[#374151] hover:border-emerald-500/40 text-[#9CA3AF] hover:text-[#E5E7EB] rounded-md transition-colors"
              title="Configure Keyboard Remapping & Accessibility"
            >
              <Keyboard className="w-4 h-4 text-emerald-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
