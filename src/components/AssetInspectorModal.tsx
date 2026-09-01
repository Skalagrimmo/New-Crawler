import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertTriangle, Database, Image as ImageIcon, Trash2, CheckCircle2 } from 'lucide-react';
import { assetManager, AssetLogEvent } from '../engine/AssetManager';
import { MemoryBudget, TextureAsset } from '../engine/types';

interface AssetInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssetInspectorModal: React.FC<AssetInspectorModalProps> = ({ isOpen, onClose }) => {
  const [budget, setBudget] = useState<MemoryBudget>(assetManager.getMemoryBudget());
  const [textures, setTextures] = useState<TextureAsset[]>([]);
  const [logs, setLogs] = useState<AssetLogEvent[]>([]);
  const [selectedTexture, setSelectedTexture] = useState<TextureAsset | null>(null);
  const [simulatedErrorFeedback, setSimulatedErrorFeedback] = useState<string | null>(null);

  const refreshData = () => {
    setBudget(assetManager.getMemoryBudget());
    const all = assetManager.getAllTextures();
    setTextures(all);
    setLogs(assetManager.getLogs());
    if (all.length > 0 && !selectedTexture) {
      setSelectedTexture(all[0]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
      const unsub = assetManager.subscribe(() => {
        refreshData();
      });
      return () => unsub();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulateLoadError = () => {
    const fakeId = `missing_asset_${Math.random().toString(36).substr(2, 4)}.png`;
    // Attempt to retrieve a non-existent asset to trigger procedural fallback
    const fallback = assetManager.getTexture(fakeId);
    setSimulatedErrorFeedback(`Asset load failed for '${fakeId}'. Fallback wireframe texture automatically generated & bound!`);
    refreshData();
    if (fallback) setSelectedTexture(fallback);
    setTimeout(() => setSimulatedErrorFeedback(null), 4500);
  };

  const handleCreateProceduralTexture = () => {
    const id = `custom_vfx_${Date.now().toString().slice(-4)}`;
    assetManager.createProceduralTexture(
      id,
      `Procedural VFX Grid (${id})`,
      64,
      64,
      (ctx, w, h) => {
        ctx.fillStyle = '#050807';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#c792ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#3dffa0';
        ctx.fillRect(w / 2 - 8, h / 2 - 8, 16, 16);
      },
      ['custom', 'vfx']
    );
    refreshData();
  };

  const usedMB = (budget.currentTextureMemoryBytes / (1024 * 1024)).toFixed(2);
  const maxMB = (budget.maxTextureMemoryBytes / (1024 * 1024)).toFixed(2);
  const peakMB = (budget.peakMemoryBytes / (1024 * 1024)).toFixed(2);
  const memoryPercent = Math.min(100, Math.round((budget.currentTextureMemoryBytes / budget.maxTextureMemoryBytes) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans">
      <div className="bg-[#0F1219] border border-[#1F2937] rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#11141B] border-b border-[#1F2937] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-100 font-serif italic text-base">
            <Database className="w-4 h-4 text-emerald-400 not-italic" />
            <span>Pascal Asset Manager & Memory Pool</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#1A1E26] text-[#9CA3AF] hover:text-[#E5E7EB] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs text-[#E5E7EB]">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#1A1E26] border border-[#374151] p-3 rounded-md">
              <div className="text-[#9CA3AF] text-[10px] uppercase tracking-wider">Active VRAM Pool</div>
              <div className="text-base font-mono font-bold text-emerald-400 mt-0.5">{usedMB} MB</div>
              <div className="text-[10px] text-[#6B7280]">Limit: {maxMB} MB</div>
              <div className="w-full bg-[#080A0F] h-1.5 rounded-full mt-2 overflow-hidden border border-[#374151]">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${memoryPercent}%` }}
                />
              </div>
            </div>

            <div className="bg-[#1A1E26] border border-[#374151] p-3 rounded-md">
              <div className="text-[#9CA3AF] text-[10px] uppercase tracking-wider">Allocated Textures</div>
              <div className="text-base font-mono font-bold text-[#38BDF8] mt-0.5">{budget.allocatedTexturesCount}</div>
              <div className="text-[10px] text-[#6B7280]">Peak: {peakMB} MB</div>
            </div>

            <div className="bg-[#1A1E26] border border-[#374151] p-3 rounded-md">
              <div className="text-[#9CA3AF] text-[10px] uppercase tracking-wider">LRU Evictions</div>
              <div className="text-base font-mono font-bold text-[#FBBF24] mt-0.5">{budget.evictionCount}</div>
              <div className="text-[10px] text-[#6B7280]">Memory auto-reclaimed</div>
            </div>

            <div className="bg-[#1A1E26] border border-[#374151] p-3 rounded-md">
              <div className="text-[#9CA3AF] text-[10px] uppercase tracking-wider">Error Fallbacks</div>
              <div className="text-base font-mono font-bold text-[#A78BFA] mt-0.5">{budget.fallbackCount}</div>
              <div className="text-[10px] text-[#6B7280]">Robust recovery hits</div>
            </div>
          </div>

          {/* Error Injection Notification */}
          {simulatedErrorFeedback && (
            <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-md flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{simulatedErrorFeedback}</span>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 bg-[#1A1E26] border border-[#374151] p-2.5 rounded-md">
            <button
              onClick={handleSimulateLoadError}
              className="px-3 py-1.5 bg-[#0F1219] border border-[#EF4444]/60 text-[#EF4444] hover:bg-[#EF4444]/15 rounded text-xs transition-colors flex items-center gap-1.5 font-medium"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Test Error Handling (Inject Missing Asset)</span>
            </button>

            <button
              onClick={handleCreateProceduralTexture}
              className="px-3 py-1.5 bg-[#0F1219] border border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/15 rounded text-xs transition-colors flex items-center gap-1.5 font-medium"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Allocate Dynamic Texture (+16 KB)</span>
            </button>

            <button
              onClick={refreshData}
              className="px-3 py-1.5 bg-[#0F1219] border border-[#374151] text-[#9CA3AF] hover:text-[#E5E7EB] rounded text-xs transition-colors flex items-center gap-1.5 ml-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Pool</span>
            </button>
          </div>

          {/* Main Inspection Grid: Left Textures List, Right Preview */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Texture List */}
            <div className="md:col-span-5 bg-[#1A1E26] border border-[#374151] rounded-md p-2.5 max-h-72 overflow-y-auto space-y-1.5">
              <div className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-2 font-semibold">
                Texture Memory Entries ({textures.length})
              </div>
              {textures.map((tex) => (
                <div
                  key={tex.id}
                  onClick={() => setSelectedTexture(tex)}
                  className={`p-2 rounded border cursor-pointer transition-colors flex items-center justify-between text-xs ${
                    selectedTexture?.id === tex.id
                      ? 'bg-emerald-500/15 border-emerald-500/80 text-emerald-400'
                      : 'bg-[#11141B] border-[#374151] hover:border-[#6B7280] text-[#E5E7EB]'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="font-medium truncate">{tex.name}</div>
                    <div className="text-[10px] text-[#9CA3AF] font-mono">
                      {tex.width}x{tex.height} px • {(tex.memoryBytes / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    {tex.isAtlas && (
                      <span className="bg-black/40 border border-[#374151] text-[#38BDF8] text-[9px] px-1.5 py-0.5 rounded font-bold font-mono">
                        ATLAS
                      </span>
                    )}
                    {tex.isFallback && (
                      <span className="bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444] text-[9px] px-1.5 py-0.5 rounded font-bold font-mono">
                        FALLBACK
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Visual Canvas Preview */}
            <div className="md:col-span-7 bg-[#1A1E26] border border-[#374151] rounded-md p-3 flex flex-col items-center justify-center min-h-64">
              {selectedTexture ? (
                <div className="w-full flex flex-col items-center">
                  <div className="text-xs font-semibold text-[#FBBF24] mb-2 self-start flex items-center justify-between w-full">
                    <span>{selectedTexture.name}</span>
                    <span className="text-[#6B7280] font-mono text-[10px]">ID: {selectedTexture.id}</span>
                  </div>

                  <div className="bg-[#080A0F] border border-dashed border-[#374151] p-2 rounded-md flex items-center justify-center max-w-full overflow-hidden">
                    <img
                      src={selectedTexture.canvas.toDataURL()}
                      alt={selectedTexture.name}
                      className="max-h-56 object-contain image-rendering-pixelated"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 w-full text-[10px] text-[#9CA3AF] bg-[#11141B] border border-[#374151] p-2 rounded-md font-mono">
                    <div>
                      Resolution: <b className="text-[#E5E7EB]">{selectedTexture.width}x{selectedTexture.height}</b>
                    </div>
                    <div>
                      RAM size: <b className="text-[#E5E7EB]">{(selectedTexture.memoryBytes / 1024).toFixed(1)} KB</b>
                    </div>
                    <div>
                      Ref Count: <b className="text-[#E5E7EB]">{selectedTexture.refCount}</b>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[#6B7280] text-xs">Select a texture from the list to preview</div>
              )}
            </div>
          </div>

          {/* Event Logs */}
          <div className="bg-[#1A1E26] border border-[#374151] p-2.5 rounded-md">
            <div className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1.5 font-semibold">
              Asset Manager Event & Eviction Log
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] font-mono">
              {logs.slice(0, 15).map((log) => (
                <div key={log.id} className="flex items-start gap-2">
                  <span className="text-[#6B7280]">[{new Date().toLocaleTimeString()}]</span>
                  <span
                    className={
                      log.type === 'loaded'
                        ? 'text-emerald-400'
                        : log.type === 'fallback'
                        ? 'text-[#FBBF24]'
                        : log.type === 'evicted'
                        ? 'text-[#38BDF8]'
                        : 'text-[#EF4444]'
                    }
                  >
                    [{log.type.toUpperCase()}]
                  </span>
                  <span className="text-[#E5E7EB]">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
