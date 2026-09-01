import React from 'react';
import { X, Layers, Cpu, CheckCircle, ArrowRight } from 'lucide-react';
import { BatchStats } from '../engine/SpriteBatcher';
import { SpriteBatch } from '../engine/types';

interface BatchInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: BatchStats;
  batches: SpriteBatch[];
}

export const BatchInspectorModal: React.FC<BatchInspectorModalProps> = ({
  isOpen,
  onClose,
  stats,
  batches,
}) => {
  if (!isOpen) return null;

  const rawDrawCalls = stats.totalSprites;
  const savedCalls = Math.max(0, rawDrawCalls - stats.drawCalls);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans">
      <div className="bg-[#0F1219] border border-[#1F2937] rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#11141B] border-b border-[#1F2937] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-100 font-serif italic text-base">
            <Layers className="w-4 h-4 text-[#A78BFA] not-italic" />
            <span>Sprite Batching & Draw Call Optimizer</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#1A1E26] text-[#9CA3AF] hover:text-[#E5E7EB] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs text-[#E5E7EB]">
          {/* KPI summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#1A1E26] border border-[#374151] p-3 rounded-md">
              <div className="text-[#9CA3AF] text-[10px] uppercase tracking-wider">Batched Draw Calls</div>
              <div className="text-xl font-mono font-bold text-emerald-400 mt-0.5">{stats.drawCalls}</div>
              <div className="text-[10px] text-[#6B7280]">Actual GPU submissions</div>
            </div>

            <div className="bg-[#1A1E26] border border-[#374151] p-3 rounded-md">
              <div className="text-[#9CA3AF] text-[10px] uppercase tracking-wider">Draw Calls Saved</div>
              <div className="text-xl font-mono font-bold text-[#FBBF24] mt-0.5">{savedCalls}</div>
              <div className="text-[10px] text-[#6B7280]">Coalesced quad passes</div>
            </div>

            <div className="bg-[#1A1E26] border border-[#374151] p-3 rounded-md">
              <div className="text-[#9CA3AF] text-[10px] uppercase tracking-wider">Batching Efficiency</div>
              <div className="text-xl font-mono font-bold text-[#38BDF8] mt-0.5">{stats.efficiencyPercent}%</div>
              <div className="text-[10px] text-[#6B7280]">State change reduction</div>
            </div>

            <div className="bg-[#1A1E26] border border-[#374151] p-3 rounded-md">
              <div className="text-[#9CA3AF] text-[10px] uppercase tracking-wider">Vertex Quads</div>
              <div className="text-xl font-mono font-bold text-[#A78BFA] mt-0.5">{stats.vertexCount}</div>
              <div className="text-[10px] text-[#6B7280]">Total active vertices</div>
            </div>
          </div>

          {/* Comparison Bar */}
          <div className="bg-[#1A1E26] border border-[#374151] p-3 rounded-md space-y-2">
            <div className="text-[11px] font-semibold text-[#FBBF24] flex items-center justify-between">
              <span>DRAW CALL OPTIMIZATION COMPARISON</span>
              <span className="text-emerald-400 font-mono">{stats.efficiencyPercent}% Overhead Reduction</span>
            </div>

            <div className="space-y-2 pt-1">
              <div>
                <div className="flex justify-between text-[10px] text-[#9CA3AF] mb-1 font-mono">
                  <span>Without Batching (Naive 1:1 Draw Calls):</span>
                  <span className="text-[#EF4444] font-semibold">{rawDrawCalls} draw calls</span>
                </div>
                <div className="w-full bg-[#080A0F] h-2 rounded-full overflow-hidden border border-[#374151]">
                  <div className="bg-[#EF4444] h-full w-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-[#9CA3AF] mb-1 font-mono">
                  <span>With NetCrawler Pascal Sprite Batcher:</span>
                  <span className="text-emerald-400 font-bold">{stats.drawCalls} draw call(s)</span>
                </div>
                <div className="w-full bg-[#080A0F] h-2 rounded-full overflow-hidden border border-[#374151]">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{
                      width: `${Math.max(5, (stats.drawCalls / (rawDrawCalls || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Active Batches Breakdown */}
          <div className="bg-[#1A1E26] border border-[#374151] p-3 rounded-md">
            <div className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-2.5 font-semibold flex items-center justify-between">
              <span>Active Compiled Batches in Current Frame ({batches.length})</span>
              <span className="text-[#A78BFA] font-mono">Texture Switches: {stats.textureSwitches}</span>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {batches.map((batch, idx) => (
                <div
                  key={idx}
                  className="bg-[#11141B] border border-[#374151] p-2.5 rounded-md flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-black/40 text-emerald-400 border border-[#374151] px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                      Batch #{idx + 1}
                    </span>
                    <div>
                      <div className="font-medium text-[#E5E7EB]">
                        Texture: <span className="text-[#38BDF8] font-mono">{batch.textureId}</span>
                      </div>
                      <div className="text-[10px] text-[#9CA3AF]">
                        Blend Mode: <span className="text-[#FBBF24] font-mono">{batch.blendMode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-emerald-400">
                      {batch.sprites.length} Sprites
                    </div>
                    <div className="text-[10px] text-[#6B7280]">
                      {batch.sprites.length * 4} Vertices (1 Call)
                    </div>
                  </div>
                </div>
              ))}

              {batches.length === 0 && (
                <div className="text-center py-6 text-[#6B7280] text-xs">
                  No active sprite batches currently queued.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
