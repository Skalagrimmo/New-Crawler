import React, { useEffect, useState, useRef } from 'react';
import {
  Save,
  Download,
  Upload,
  Trash2,
  X,
  Check,
  Clock,
  HardDrive,
  Shield,
  Heart,
  Zap,
  Coins,
  Database,
  RefreshCw,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import { gameCore } from '../game/GameCore';
import { saveManager, SaveSlotMetadata } from '../game/SaveManager';
import { audioSynth } from '../engine/AudioSynth';
import { touchHaptics } from '../engine/TouchHaptics';

interface SaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_SLOTS = [
  { key: 'netcrawler_save_primary', name: 'Auto-Sync Active Session', desc: 'Continuous background checkpoint', isAuto: true },
  { key: 'netcrawler_save_slot1', name: 'Memory Slot Alpha', desc: 'Manual runner checkpoint #1', isAuto: false },
  { key: 'netcrawler_save_slot2', name: 'Memory Slot Beta', desc: 'Manual runner checkpoint #2', isAuto: false },
  { key: 'netcrawler_save_slot3', name: 'Memory Slot Gamma', desc: 'Manual runner checkpoint #3', isAuto: false },
  { key: 'netcrawler_save_quicksave', name: 'QuickSave Buffer', desc: 'Dedicated F5 quick checkpoint', isAuto: false },
];

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({ isOpen, onClose }) => {
  const [slots, setSlots] = useState<SaveSlotMetadata[]>([]);
  const [activeTab, setActiveTab] = useState<'slots' | 'backup' | 'pascal'>('slots');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);
  const [lastSaved, setLastSaved] = useState<number | null>(saveManager.getLastSavedTimestamp());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshSlots = () => {
    setSlots(saveManager.listAllSlots());
    setLastSaved(saveManager.getLastSavedTimestamp());
  };

  useEffect(() => {
    if (isOpen) {
      refreshSlots();
      const unsub = saveManager.subscribe(refreshSlots);
      return () => unsub();
    }
  }, [isOpen]);

  const showToast = (text: string, type: 'success' | 'danger' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 3500);
  };

  if (!isOpen) return null;

  const handleSaveToSlot = (slotKey: string, slotName: string) => {
    const success = gameCore.saveToStorage(slotKey, slotName);
    if (success) {
      showToast(`Successfully saved to [${slotName}]!`);
      refreshSlots();
    } else {
      showToast('Failed to save to local storage.', 'danger');
    }
  };

  const handleLoadFromSlot = (slotKey: string) => {
    const success = gameCore.loadFromStorage(slotKey);
    if (success) {
      showToast('Neural Link restored successfully!');
      refreshSlots();
      setTimeout(() => {
        onClose();
      }, 500);
    } else {
      showToast('Failed to load save state.', 'danger');
    }
  };

  const handleDeleteSlot = (slotKey: string) => {
    saveManager.deleteSave(slotKey);
    showToast('Save slot removed.');
    refreshSlots();
  };

  const handleExportJson = (slotKey = 'netcrawler_save_primary') => {
    const jsonStr = saveManager.exportSaveFile(slotKey);
    if (!jsonStr) {
      showToast('No save state found to export.', 'danger');
      return;
    }
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netcrawler_save_${gameCore.player.name.toLowerCase()}_floor${gameCore.floor}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Save file exported to JSON download.');
    audioSynth.playPickup();
    touchHaptics.trigger('light_tap');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = saveManager.importSaveFile(content, 'netcrawler_save_primary');
      if (res.success) {
        gameCore.loadFromStorage('netcrawler_save_primary');
        showToast('Save file imported and loaded into active session!');
        refreshSlots();
        setTimeout(() => onClose(), 600);
      } else {
        showToast(`Import failed: ${res.error}`, 'danger');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all saved NetCrawler sessions from Local Storage?')) {
      saveManager.clearAllGameData();
      showToast('All local storage records cleared.');
      refreshSlots();
    }
  };

  return (
    <div
      id="save_load_modal_backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="save_load_modal_card"
        className="bg-[#0F1219] border border-[#1F2937] w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#1F2937] flex items-center justify-between bg-[#11141B]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#E5E7EB] tracking-wide">
                  Local Storage Neural Sync
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  PERSISTENCE ACTIVE
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF]">
                Resume game progress (HP, Inventory, Position, Floor, Map Fog) after browser refresh
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

        {/* Live Active Session Bar */}
        <div className="bg-[#161B26] px-5 py-3 border-b border-[#1F2937] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[#9CA3AF]">Current Runner:</span>
              <span className="font-mono font-bold text-emerald-400">{gameCore.player.name}</span>
              <span className="text-[11px] text-[#6B7280]">({gameCore.player.className} Lv.{gameCore.player.level})</span>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-[#EF4444] font-mono">
                <Heart className="w-3.5 h-3.5" />
                {gameCore.player.hp}/{gameCore.player.maxHp} HP
              </span>
              <span className="flex items-center gap-1 text-[#38BDF8] font-mono">
                <Shield className="w-3.5 h-3.5" />
                {gameCore.player.shield} SHD
              </span>
              <span className="flex items-center gap-1 text-[#F59E0B] font-mono">
                <Coins className="w-3.5 h-3.5" />
                {gameCore.player.credits} CR
              </span>
              <span className="text-[#9CA3AF] font-mono">
                {gameCore.zone} : F{gameCore.floor} (X:{gameCore.playerPos.x}, Y:{gameCore.playerPos.y})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSaveToSlot('netcrawler_save_primary', 'Manual Quick-Sync')}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Quick Sync Now</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#1F2937] px-5 bg-[#0F1219] text-xs font-medium">
          <button
            onClick={() => setActiveTab('slots')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'slots'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-[#9CA3AF] hover:text-[#E5E7EB]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Memory Slots ({slots.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'backup'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-[#9CA3AF] hover:text-[#E5E7EB]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON Export / Import</span>
          </button>

          <button
            onClick={() => setActiveTab('pascal')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'pascal'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-[#9CA3AF] hover:text-[#E5E7EB]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Pascal Persistence Specs</span>
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMsg && (
          <div
            className={`mx-5 mt-4 p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-[#EF4444]'
            }`}
          >
            {feedbackMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'slots' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                <span>Persistent browser storage slots (LocalStorage key: <code>netcrawler_save_*</code>):</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  Auto-saves on every move & combat turn
                </span>
              </div>

              <div className="space-y-2.5">
                {PRESET_SLOTS.map((slot) => {
                  const existing = slots.find((s) => s.key === slot.key);
                  const isCurrentActive = slot.key === 'netcrawler_save_primary';

                  return (
                    <div
                      key={slot.key}
                      className={`p-3.5 rounded-lg border transition-all ${
                        existing
                          ? isCurrentActive
                            ? 'bg-[#151A24] border-emerald-500/40'
                            : 'bg-[#121620] border-[#2A3444]'
                          : 'bg-[#0D1017] border-[#1F2937]/70'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-[#E5E7EB]">
                              {slot.name}
                            </span>
                            {slot.isAuto && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                AUTO-SYNC
                              </span>
                            )}
                            {existing && (
                              <span className="text-[10px] text-[#9CA3AF] flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {saveManager.formatRelativeTime(existing.timestamp)}
                              </span>
                            )}
                          </div>

                          {existing ? (
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#9CA3AF]">
                              <span className="text-emerald-300 font-mono font-medium">
                                {existing.playerName} ({existing.className} Lv.{existing.level})
                              </span>
                              <span>•</span>
                              <span className="text-[#EF4444] font-mono">
                                {existing.hp}/{existing.maxHp} HP
                              </span>
                              <span>•</span>
                              <span className="text-emerald-400 font-mono">
                                {existing.zone} F{existing.floor}
                              </span>
                              <span>•</span>
                              <span className="text-[#F59E0B] font-mono">
                                {existing.credits} Credits
                              </span>
                              <span>•</span>
                              <span>{existing.itemCount} Items</span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-[#6B7280]">
                              {slot.desc} • [Empty Slot]
                            </p>
                          )}
                        </div>

                        {/* Slot Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveToSlot(slot.key, slot.name)}
                            className="px-2.5 py-1.5 bg-[#1F2937] hover:bg-[#2B3547] text-[#E5E7EB] hover:text-emerald-300 border border-[#374151] rounded text-xs flex items-center gap-1 transition-colors"
                            title="Save current game state into this slot"
                          >
                            <Save className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Save</span>
                          </button>

                          {existing && (
                            <>
                              <button
                                onClick={() => handleLoadFromSlot(slot.key)}
                                className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded text-xs flex items-center gap-1 transition-colors font-medium"
                                title="Restore this save state"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>Load</span>
                              </button>

                              <button
                                onClick={() => handleDeleteSlot(slot.key)}
                                className="p-1.5 bg-[#1F2937]/50 hover:bg-red-500/20 text-[#6B7280] hover:text-[#EF4444] border border-[#374151] rounded text-xs transition-colors"
                                title="Delete this save slot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-between items-center text-xs text-[#6B7280]">
                <span>Press <b>F5</b> during gameplay to trigger an instant QuickSave.</span>
                <button
                  onClick={handleClearAll}
                  className="text-red-400/80 hover:text-red-400 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Purge All Storage Records</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#141822] rounded-lg border border-[#1F2937] space-y-3">
                <div className="flex items-center gap-2 text-[#E5E7EB] font-semibold text-xs">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Export Save File (JSON)</span>
                </div>
                <p className="text-xs text-[#9CA3AF]">
                  Download a complete backup snapshot of your current character vitals, equipped weapons, inventory bag, floor progression, and explored map nodes to a portable <code>.json</code> file.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleExportJson('netcrawler_save_primary')}
                    className="px-3 py-2 bg-[#1F2937] hover:bg-[#2D3748] text-[#E5E7EB] border border-[#374151] rounded-md text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Download Active Session JSON</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-[#141822] rounded-lg border border-[#1F2937] space-y-3">
                <div className="flex items-center gap-2 text-[#E5E7EB] font-semibold text-xs">
                  <Upload className="w-4 h-4 text-[#38BDF8]" />
                  <span>Import Save File (JSON)</span>
                </div>
                <p className="text-xs text-[#9CA3AF]">
                  Restore a previously exported NetCrawler JSON save file from your device.
                </p>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportFile}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-[#1F2937] hover:bg-[#2D3748] text-[#E5E7EB] border border-[#374151] rounded-md text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-[#38BDF8]" />
                    <span>Choose JSON Save File...</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pascal' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#11141B] rounded-lg border border-[#1F2937] text-[#9CA3AF] space-y-2">
                <p className="text-emerald-400 font-mono font-semibold">
                  FreePascal / Castle Engine Record Persistence Model (USaveSystem.pas)
                </p>
                <p>
                  In native FreePascal compilation targets (Linux x86_64, Android ARM64, and Raspberry Pi), the state is serialized into an identical binary/JSON record stream matching the TypeScript state machine:
                </p>
                <pre className="p-2.5 bg-black/60 rounded border border-[#2D3748] font-mono text-[11px] text-emerald-300 overflow-x-auto">
{`type
  TSavedPlayer = record
    Name: String[32];
    ClassName: String[32];
    Level: Integer;
    HP, MaxHP, Shield, MaxShield: Integer;
    RAM, MaxRAM, RAMRegen: Integer;
    Credits, DataFragments: Integer;
    PosX, PosY: Integer;
    Floor, Turn: Integer;
    Zone: String[16];
    Inventory: array of TInventorySlot;
  end;

procedure SaveGameToFile(const FileName: string; const State: TGameState);
function LoadGameFromFile(const FileName: string; var State: TGameState): Boolean;`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#1F2937] bg-[#11141B] flex items-center justify-between text-xs">
          <div className="text-[#6B7280] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {lastSaved ? `Last Neural Sync: ${saveManager.formatRelativeTime(lastSaved)}` : 'Session active'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1F2937] hover:bg-[#2D3748] text-[#E5E7EB] rounded text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
