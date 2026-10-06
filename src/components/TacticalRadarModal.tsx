import React from 'react';
import {
  MapPin,
  X,
  Compass,
  Radio,
  Sparkles,
  Shield,
  Key,
  Database,
  Lock,
  Layers,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { GameCore } from '../game/GameCore';
import { MiniMap } from './MiniMap';
import { TILE_TYPES, TILE_DESCRIPTIONS } from '../game/GameWorld';

interface TacticalRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameCore: GameCore;
}

export const TacticalRadarModal: React.FC<TacticalRadarModalProps> = ({
  isOpen,
  onClose,
  gameCore,
}) => {
  if (!isOpen) return null;

  const world = gameCore.world;
  const mapW = world.getWidth();
  const mapH = world.getHeight();
  const totalTiles = mapW * mapH;

  let exploredCount = 0;
  let dataCount = 0;
  let virusCount = 0;
  let cacheCount = 0;
  let portalDiscovered = false;

  for (let y = 0; y < mapH; y++) {
    for (let x = 0; x < mapW; x++) {
      if (world.isExplored(x, y)) {
        exploredCount++;
        const tile = world.getTile(x, y);
        if (tile === TILE_TYPES.DATA) dataCount++;
        if (tile === TILE_TYPES.VIRUS) virusCount++;
        if (tile === TILE_TYPES.CACHE) cacheCount++;
        if (tile === TILE_TYPES.PORTAL) portalDiscovered = true;
      }
    }
  }

  const explorationPct = Math.round((exploredCount / totalTiles) * 100);

  return (
    <div
      id="tactical_radar_modal_backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="tactical_radar_modal_card"
        className="bg-[#0F1219] border border-[#1F2937] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1F2937] flex items-center justify-between bg-[#11141B]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#E5E7EB] tracking-wide">
                  Tactical Grid & Sector Radar
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {gameCore.zone} - F{gameCore.floor}
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF]">
                Complete spatial matrix, fog-of-war discovery, and point-of-interest telemetry
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1F2937] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tactical Quick Stats */}
        <div className="bg-[#161B26] px-5 py-2.5 border-b border-[#1F2937] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <span className="text-[#9CA3AF]">
              Player Position: <b className="font-mono text-emerald-400">X:{gameCore.playerPos.x}, Y:{gameCore.playerPos.y}</b> ({gameCore.playerDir})
            </span>
            <span className="text-[#9CA3AF]">
              Exploration: <b className="font-mono text-emerald-400">{explorationPct}%</b> ({exploredCount}/{totalTiles})
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            {portalDiscovered ? (
              <span className="text-[#C084FC] font-mono font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Boss Gate Located
              </span>
            ) : (
              <span className="text-[#6B7280] font-mono">
                Boss Gate: Undiscovered
              </span>
            )}

            {gameCore.hasKeycard ? (
              <span className="text-[#FBBF24] font-mono font-bold flex items-center gap-1">
                <Key className="w-3.5 h-3.5" />
                Keycard Ready
              </span>
            ) : (
              <span className="text-[#EF4444] font-mono flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                Keycard Required
              </span>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <MiniMap
            gameCore={gameCore}
            variant="expanded"
            className="w-full"
          />

          {/* Detailed Sector Legend & Navigation Briefing */}
          <div className="p-4 bg-[#141822] rounded-lg border border-[#1F2937] space-y-2.5">
            <div className="flex items-center gap-2 text-[#E5E7EB] font-semibold text-xs border-b border-[#1F2937] pb-1.5">
              <Info className="w-4 h-4 text-emerald-400" />
              <span>Tactical Node Signatures Guide</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-[#0F1219] border border-[#1F2937] rounded flex items-start gap-2">
                <span className="font-mono font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded text-[11px]">
                  ▲
                </span>
                <div>
                  <span className="font-semibold text-emerald-300">Runner (You)</span>
                  <p className="text-[11px] text-[#9CA3AF]">Current position and facing direction.</p>
                </div>
              </div>

              <div className="p-2 bg-[#0F1219] border border-[#1F2937] rounded flex items-start gap-2">
                <span className="font-mono font-bold text-[#C084FC] bg-[#7E22CE]/30 px-1.5 py-0.5 rounded text-[11px]">
                  P
                </span>
                <div>
                  <span className="font-semibold text-[#C084FC]">Master Exit Portal</span>
                  <p className="text-[11px] text-[#9CA3AF]">Breach to access Sector Boss or next floor.</p>
                </div>
              </div>

              <div className="p-2 bg-[#0F1219] border border-[#1F2937] rounded flex items-start gap-2">
                <span className="font-mono font-bold text-[#38BDF8] bg-[#0369A1]/30 px-1.5 py-0.5 rounded text-[11px]">
                  D
                </span>
                <div>
                  <span className="font-semibold text-[#38BDF8]">Encrypted Data Store</span>
                  <p className="text-[11px] text-[#9CA3AF]">Contains valuable credits & consumable items.</p>
                </div>
              </div>

              <div className="p-2 bg-[#0F1219] border border-[#1F2937] rounded flex items-start gap-2">
                <span className="font-mono font-bold text-[#FBBF24] bg-[#92400E]/30 px-1.5 py-0.5 rounded text-[11px]">
                  C
                </span>
                <div>
                  <span className="font-semibold text-[#FBBF24]">Sub-Grid Cache</span>
                  <p className="text-[11px] text-[#9CA3AF]">Holds high-tier gear and Security Keycards.</p>
                </div>
              </div>

              <div className="p-2 bg-[#0F1219] border border-[#1F2937] rounded flex items-start gap-2">
                <span className="font-mono font-bold text-[#34D399] bg-[#065F46]/30 px-1.5 py-0.5 rounded text-[11px]">
                  S
                </span>
                <div>
                  <span className="font-semibold text-[#34D399]">Safe Recovery Node</span>
                  <p className="text-[11px] text-[#9CA3AF]">Restores integrity and neural stability.</p>
                </div>
              </div>

              <div className="p-2 bg-[#0F1219] border border-[#1F2937] rounded flex items-start gap-2">
                <span className="font-mono font-bold text-[#F87171] bg-[#991B1B]/30 px-1.5 py-0.5 rounded text-[11px]">
                  V
                </span>
                <div>
                  <span className="font-semibold text-[#F87171]">Virus Daemon</span>
                  <p className="text-[11px] text-[#9CA3AF]">Hostile firewall sentry patrolling corridor.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#1F2937] bg-[#11141B] flex items-center justify-between text-xs">
          <span className="text-[#6B7280]">
            Use WASD or Arrow Keys to navigate through the sector.
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded text-xs transition-colors"
          >
            Close Radar
          </button>
        </div>
      </div>
    </div>
  );
};
