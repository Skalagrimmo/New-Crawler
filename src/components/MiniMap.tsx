import React, { useState, useEffect } from 'react';
import {
  Compass,
  Maximize2,
  Minimize2,
  MapPin,
  Radio,
  Eye,
  Crosshair,
  Sparkles,
  Shield,
  Key,
  Database,
  Lock,
  Layers,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { GameCore } from '../game/GameCore';
import { TILE_TYPES, TileType, TILE_DESCRIPTIONS } from '../game/GameWorld';
import { audioSynth } from '../engine/AudioSynth';
import { touchHaptics } from '../engine/TouchHaptics';

interface MiniMapProps {
  gameCore: GameCore;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
  variant?: 'compact' | 'hud' | 'expanded';
}

interface TileLegendInfo {
  type: TileType;
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
}

const TILE_VISUALS: Record<TileType, TileLegendInfo> = {
  [TILE_TYPES.WALL]: {
    type: TILE_TYPES.WALL,
    label: 'Firewall',
    color: '#64748B',
    bg: '#1E293B',
    border: '#334155',
    icon: '#',
  },
  [TILE_TYPES.PATH]: {
    type: TILE_TYPES.PATH,
    label: 'Corridor',
    color: '#475569',
    bg: '#0F172A',
    border: '#1E293B',
    icon: '•',
  },
  [TILE_TYPES.DATA]: {
    type: TILE_TYPES.DATA,
    label: 'Data Store',
    color: '#38BDF8',
    bg: '#0369A1',
    border: '#38BDF8',
    icon: 'D',
  },
  [TILE_TYPES.PORTAL]: {
    type: TILE_TYPES.PORTAL,
    label: 'Exit Portal',
    color: '#C084FC',
    bg: '#7E22CE',
    border: '#C084FC',
    icon: 'P',
  },
  [TILE_TYPES.VIRUS]: {
    type: TILE_TYPES.VIRUS,
    label: 'Virus Daemon',
    color: '#F87171',
    bg: '#991B1B',
    border: '#F87171',
    icon: 'V',
  },
  [TILE_TYPES.SAFE]: {
    type: TILE_TYPES.SAFE,
    label: 'Safe Node',
    color: '#34D399',
    bg: '#065F46',
    border: '#34D399',
    icon: 'S',
  },
  [TILE_TYPES.CACHE]: {
    type: TILE_TYPES.CACHE,
    label: 'Sub-Grid Cache',
    color: '#FBBF24',
    bg: '#92400E',
    border: '#FBBF24',
    icon: 'C',
  },
  [TILE_TYPES.BALCONY]: {
    type: TILE_TYPES.BALCONY,
    label: 'Overclock Node',
    color: '#FB923C',
    bg: '#9A3412',
    border: '#FB923C',
    icon: 'B',
  },
  [TILE_TYPES.TERMINAL]: {
    type: TILE_TYPES.TERMINAL,
    label: 'Sec Terminal',
    color: '#A78BFA',
    bg: '#5B21B6',
    border: '#A78BFA',
    icon: 'K',
  },
  [TILE_TYPES.DOOR]: {
    type: TILE_TYPES.DOOR,
    label: 'Sector Gate',
    color: '#FB7185',
    bg: '#9F1239',
    border: '#FB7185',
    icon: 'G',
  },
};

export const MiniMap: React.FC<MiniMapProps> = ({
  gameCore,
  isExpanded = false,
  onToggleExpand,
  className = '',
  variant = 'compact',
}) => {
  const [hoveredTile, setHoveredTile] = useState<{
    x: number;
    y: number;
    tile: TileType;
    isExplored: boolean;
  } | null>(null);
  const [filterType, setFilterType] = useState<TileType | null>(null);
  const [isPingActive, setIsPingActive] = useState<boolean>(false);

  const world = gameCore.world;
  const mapW = world.getWidth();
  const mapH = world.getHeight();
  const grid = world.getGrid();
  const playerPos = gameCore.playerPos;
  const playerDir = gameCore.playerDir;

  // Calculate exploration stats
  let totalTiles = mapW * mapH;
  let exploredCount = 0;
  const poiCounts: Partial<Record<TileType, number>> = {};

  for (let y = 0; y < mapH; y++) {
    for (let x = 0; x < mapW; x++) {
      if (world.isExplored(x, y)) {
        exploredCount++;
        const tile = world.getTile(x, y);
        if (tile !== TILE_TYPES.PATH && tile !== TILE_TYPES.WALL) {
          poiCounts[tile] = (poiCounts[tile] || 0) + 1;
        }
      }
    }
  }

  const explorationPct = Math.round((exploredCount / totalTiles) * 100);

  const handlePing = () => {
    setIsPingActive(true);
    audioSynth.playLaser(900, 0.09);
    touchHaptics.trigger('light_tap');
    setTimeout(() => {
      setIsPingActive(false);
    }, 1200);
  };

  // Direction angle indicator
  const getDirectionArrow = (dir: 'N' | 'E' | 'S' | 'W') => {
    switch (dir) {
      case 'N':
        return '▲';
      case 'E':
        return '▶';
      case 'S':
        return '▼';
      case 'W':
        return '◀';
    }
  };

  const isHudVariant = variant === 'hud';
  const isExpandedView = isExpanded || variant === 'expanded';

  return (
    <div
      id="game_minimap_container"
      className={`relative bg-[#0B0E14] border border-[#1F2937] rounded-lg overflow-hidden shadow-md flex flex-col ${
        isExpandedView ? 'p-4 max-w-xl w-full' : isHudVariant ? 'p-2 bg-[#0B0E14]/90 backdrop-blur-sm border-[#10B981]/40' : 'p-3'
      } ${className}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio
              className={`w-4 h-4 text-emerald-400 ${
                isPingActive ? 'animate-ping' : ''
              }`}
            />
            {isPingActive && (
              <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-[#E5E7EB] uppercase tracking-wider font-sans">
                Sector Mini-Map
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {gameCore.zone} F{gameCore.floor}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Radar Scanner Ping Trigger */}
          <button
            onClick={handlePing}
            className="p-1 hover:bg-[#1A1E26] text-emerald-400 hover:text-emerald-300 rounded border border-[#374151] transition-colors text-[10px] flex items-center gap-1 px-1.5"
            title="Trigger Tactical Radar Pulse"
          >
            <Sparkles className="w-3 h-3" />
            <span className="hidden sm:inline">Ping</span>
          </button>

          {onToggleExpand && (
            <button
              onClick={() => {
                onToggleExpand();
                touchHaptics.trigger('light_tap');
              }}
              className="p-1 text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1A1E26] rounded border border-[#374151] transition-colors"
              title={isExpandedView ? 'Collapse Mini-Map' : 'Expand Tactical Radar'}
            >
              {isExpandedView ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Telemetry / Status Bar */}
      <div className="flex items-center justify-between text-[11px] mb-2 px-1 text-[#9CA3AF]">
        <div className="flex items-center gap-2 font-mono">
          <span className="flex items-center gap-1 text-emerald-300">
            <MapPin className="w-3 h-3" />
            <span>X:{playerPos.x} Y:{playerPos.y}</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <Compass className="w-3 h-3" />
            <span>{playerDir} ({getDirectionArrow(playerDir)})</span>
          </span>
        </div>

        <div className="flex items-center gap-1 font-mono">
          <span className="text-[#6B7280]">Explored:</span>
          <span className="text-emerald-400 font-semibold">{explorationPct}%</span>
          <span className="text-[#6B7280] text-[10px]">({exploredCount}/{totalTiles})</span>
        </div>
      </div>

      {/* Mini-Map Radar Grid Canvas Box */}
      <div className="relative flex items-center justify-center p-2 bg-[#05070A] rounded-md border border-[#1A2332] overflow-hidden select-none">
        {/* Subtle grid lines & scanner sweep effect */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:16px_16px]" />

        {isPingActive && (
          <div className="pointer-events-none absolute inset-0 bg-emerald-500/10 animate-pulse border-2 border-emerald-500/30 rounded" />
        )}

        {/* Grid Cells */}
        <div
          className="grid gap-[2px] sm:gap-[3px] relative z-10"
          style={{
            gridTemplateColumns: `repeat(${mapW}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: mapH }).map((_, y) =>
            Array.from({ length: mapW }).map((_, x) => {
              const isExplored = world.isExplored(x, y);
              const isPlayer = playerPos.x === x && playerPos.y === y;
              const tile = world.getTile(x, y);
              const visual = TILE_VISUALS[tile] || TILE_VISUALS[TILE_TYPES.PATH];

              const isHighlighted = filterType ? tile === filterType && isExplored : false;
              const isAdjacent = Math.hypot(x - playerPos.x, y - playerPos.y) <= 1.5;

              // Compute cell dimensions based on view mode
              const cellSizeClass = isExpandedView
                ? 'w-6 h-6 sm:w-7 sm:h-7 text-[11px]'
                : isHudVariant
                ? 'w-3.5 h-3.5 sm:w-4 sm:h-4 text-[8px]'
                : 'w-4 h-4 sm:w-5 sm:h-5 text-[9px]';

              if (!isExplored) {
                return (
                  <div
                    key={`${x}-${y}`}
                    onMouseEnter={() =>
                      setHoveredTile({ x, y, tile: TILE_TYPES.WALL, isExplored: false })
                    }
                    onMouseLeave={() => setHoveredTile(null)}
                    className={`${cellSizeClass} rounded-[2px] bg-[#080B10] border border-[#111827] flex items-center justify-center transition-colors`}
                  >
                    <span className="text-[#1E293B] text-[7px] select-none">•</span>
                  </div>
                );
              }

              // Explored Cell
              let cellBg = visual.bg;
              let cellBorder = visual.border;
              let textColor = visual.color;

              if (tile === TILE_TYPES.PATH) {
                cellBg = '#0B132B';
                cellBorder = '#1C2541';
              } else if (tile === TILE_TYPES.WALL) {
                cellBg = '#1E293B';
                cellBorder = '#334155';
              }

              return (
                <div
                  key={`${x}-${y}`}
                  onMouseEnter={() =>
                    setHoveredTile({ x, y, tile, isExplored: true })
                  }
                  onMouseLeave={() => setHoveredTile(null)}
                  className={`${cellSizeClass} relative rounded-[2px] flex items-center justify-center font-mono font-bold transition-all cursor-pointer ${
                    isPlayer
                      ? 'bg-emerald-500 text-black border-2 border-[#ffffff] shadow-[0_0_10px_rgba(16,185,129,0.9)] z-20 scale-110'
                      : isHighlighted
                      ? 'border-2 ring-2 ring-amber-400 z-10 scale-105'
                      : isAdjacent
                      ? 'brightness-110'
                      : 'opacity-90'
                  }`}
                  style={{
                    backgroundColor: isPlayer ? '#10B981' : cellBg,
                    borderColor: isPlayer ? '#FFFFFF' : cellBorder,
                    color: isPlayer ? '#000000' : textColor,
                  }}
                  title={`(${x}, ${y}) - ${visual.label}`}
                >
                  {isPlayer ? (
                    <span className="text-[10px] sm:text-xs leading-none">
                      {getDirectionArrow(playerDir)}
                    </span>
                  ) : tile === TILE_TYPES.PATH ? (
                    <span className="text-[6px] opacity-40 text-[#64748B]">·</span>
                  ) : (
                    <span className="leading-none">{visual.icon}</span>
                  )}

                  {/* Pulsing ring for player position */}
                  {isPlayer && (
                    <span className="absolute -inset-0.5 rounded-full border border-emerald-400 animate-ping pointer-events-none opacity-75" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Hovered Tile Details Inspector Panel */}
      <div className="mt-2 min-h-[38px] p-1.5 bg-[#0F141F] rounded border border-[#1F2937] flex items-center justify-between text-xs font-mono">
        {hoveredTile ? (
          hoveredTile.isExplored ? (
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    TILE_VISUALS[hoveredTile.tile]?.color || '#64748B',
                }}
              />
              <div className="text-[11px]">
                <span className="font-bold text-[#E5E7EB]">
                  {TILE_VISUALS[hoveredTile.tile]?.label || 'Node'}
                </span>{' '}
                <span className="text-[#9CA3AF]">
                  (X:{hoveredTile.x}, Y:{hoveredTile.y})
                </span>
                <p className="text-[10px] text-[#6B7280] font-sans truncate max-w-[280px] sm:max-w-md">
                  {TILE_DESCRIPTIONS[hoveredTile.tile] || 'Navigable corridor sector.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#6B7280] text-[11px]">
              <Lock className="w-3.5 h-3.5" />
              <span>Uncharted Data Block (X:{hoveredTile.x}, Y:{hoveredTile.y}) — Fog of War Active</span>
            </div>
          )
        ) : (
          <div className="flex items-center gap-2 text-[#6B7280] text-[11px]">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hover or tap any sector tile for node telemetry</span>
          </div>
        )}

        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-sans">
          {gameCore.hasKeycard ? (
            <span className="flex items-center gap-1 text-[#FBBF24] bg-[#FBBF24]/10 border border-[#FBBF24]/30 px-1.5 py-0.5 rounded">
              <Key className="w-3 h-3" />
              <span>Keycard Acquired</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[#6B7280]">
              <Lock className="w-3 h-3" />
              <span>Keycard Needed</span>
            </span>
          )}
        </div>
      </div>

      {/* Discovered Points of Interest Filter Chips & Legend */}
      <div className="mt-2 pt-2 border-t border-[#1F2937] flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className="text-[#6B7280] font-mono mr-1">Discovered:</span>

        {Object.entries(poiCounts).map(([tileKey, count]) => {
          const tile = tileKey as TileType;
          const visual = TILE_VISUALS[tile];
          if (!visual || count === 0) return null;
          const isActive = filterType === tile;

          return (
            <button
              key={tile}
              onClick={() => {
                setFilterType(isActive ? null : tile);
                touchHaptics.trigger('light_tap');
              }}
              className={`px-1.5 py-0.5 rounded border flex items-center gap-1 transition-all ${
                isActive
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                  : 'bg-[#141A24] hover:bg-[#1C2534] border-[#2A3444] text-[#9CA3AF]'
              }`}
              title={`Highlight ${visual.label} tiles on map`}
            >
              <span
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: visual.color }}
              />
              <span>{visual.label}</span>
              <span className="font-mono font-bold text-white bg-black/40 px-1 rounded text-[9px]">
                {count}
              </span>
            </button>
          );
        })}

        {filterType && (
          <button
            onClick={() => setFilterType(null)}
            className="px-1.5 py-0.5 text-[#EF4444] hover:underline text-[10px]"
          >
            Clear Filter
          </button>
        )}

        {Object.keys(poiCounts).length === 0 && (
          <span className="text-[#6B7280] italic">No special nodes discovered yet.</span>
        )}
      </div>
    </div>
  );
};
