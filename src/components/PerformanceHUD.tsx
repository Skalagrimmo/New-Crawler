import React from 'react';
import { Activity, Cpu, Layers, Sparkles, Vibrate, Zap } from 'lucide-react';
import { ProfilerStats } from '../engine/types';

interface PerformanceHUDProps {
  stats: ProfilerStats;
  platformName: string;
}

export const PerformanceHUD: React.FC<PerformanceHUDProps> = ({ stats, platformName }) => {
  const isHealthyFPS = stats.fps >= 55;
  const memoryPercent = Math.min(100, Math.round((stats.memoryUsedMB / stats.memoryMaxMB) * 100));

  return (
    <div className="bg-[#0F1219] border border-[#1F2937] p-3 rounded-lg text-[11px] text-[#E5E7EB] font-sans shadow-md">
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
          <span className="text-[11px] uppercase tracking-wider text-[#9CA3AF] font-semibold">
            Real-Time Engine Telemetry
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[#6B7280]">Profile:</span>
          <span className="text-xs font-mono text-emerald-400 font-medium bg-black/40 px-2 py-0.5 rounded border border-[#374151]">
            {platformName}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* FPS */}
        <div className="bg-[#1A1E26] border border-[#374151] p-2 rounded-md flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase text-[#9CA3AF]">FPS / Frame</div>
            <div className="text-[9px] text-[#6B7280] font-mono">{stats.frameTimeMs.toFixed(1)} ms</div>
          </div>
          <div className="text-right">
            <span className={`font-mono font-bold text-sm ${isHealthyFPS ? 'text-emerald-400' : 'text-[#EF4444]'}`}>
              {stats.fps}
            </span>
          </div>
        </div>

        {/* Draw Calls & Batches */}
        <div className="bg-[#1A1E26] border border-[#374151] p-2 rounded-md flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase text-[#9CA3AF] flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#38BDF8]" />
              <span>Draw Calls</span>
            </div>
            <div className="text-[9px] text-[#6B7280] font-mono">{stats.batchesCount} active batches</div>
          </div>
          <div className="text-right font-mono font-bold text-[#38BDF8] text-sm">
            {stats.drawCalls}
          </div>
        </div>

        {/* Sprites & Particles */}
        <div className="bg-[#1A1E26] border border-[#374151] p-2 rounded-md flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase text-[#9CA3AF] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#FBBF24]" />
              <span>Sprites</span>
            </div>
            <div className="text-[9px] text-[#6B7280] font-mono">{stats.activeParticles} particles</div>
          </div>
          <div className="text-right font-mono font-bold text-[#FBBF24] text-sm">
            {stats.spritesRendered}
          </div>
        </div>

        {/* Texture Memory */}
        <div className="bg-[#1A1E26] border border-[#374151] p-2 rounded-md flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase text-[#9CA3AF] flex items-center gap-1">
              <Cpu className="w-3 h-3 text-emerald-400" />
              <span>VRAM Pool</span>
            </div>
            <div className="text-[9px] text-[#6B7280] font-mono">Max {stats.memoryMaxMB} MB</div>
          </div>
          <div className="text-right font-mono font-bold text-emerald-400 text-sm">
            {stats.memoryUsedMB.toFixed(1)} <span className="text-[10px] text-[#9CA3AF] font-normal">MB</span>
          </div>
        </div>
      </div>

      {/* Latency & Haptics sub-bar */}
      <div className="mt-2.5 pt-2 border-t border-[#1F2937] flex items-center justify-between text-[10px] text-[#9CA3AF]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>Polling Latency:</span>
            <b className="font-mono text-[#E5E7EB]">{stats.inputLatencyMs.toFixed(2)}ms</b>
          </span>
          <span className="flex items-center gap-1.5">
            <Vibrate className="w-3 h-3 text-emerald-400" />
            <span>Haptics:</span>
            <b className="font-mono text-[#E5E7EB]">{stats.hapticsTriggered} triggers</b>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#6B7280] uppercase text-[9px] tracking-wider">Memory Allocation:</span>
          <div className="w-20 h-1.5 bg-[#080A0F] border border-[#374151] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                memoryPercent > 85 ? 'bg-[#EF4444]' : memoryPercent > 60 ? 'bg-[#FBBF24]' : 'bg-emerald-500'
              }`}
              style={{ width: `${memoryPercent}%` }}
            />
          </div>
          <span className="font-mono text-xs text-[#E5E7EB] font-medium">{memoryPercent}%</span>
        </div>
      </div>
    </div>
  );
};

