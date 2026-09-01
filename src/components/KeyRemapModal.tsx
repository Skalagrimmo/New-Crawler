import React, { useState, useEffect, useRef } from 'react';
import {
  Keyboard,
  X,
  RotateCcw,
  Sliders,
  Check,
  AlertTriangle,
  Search,
  Download,
  Upload,
  Layers,
  Sparkles,
  Gamepad2,
  HelpCircle,
  Vibrate,
  Shield,
  Zap,
  Radio,
  Eye,
  Terminal,
  Activity,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import {
  inputManager,
  ACTION_DEFINITIONS,
  HARDWARE_PRESETS,
  GameAction,
  ActionCategory,
  ActionMeta,
  KeyBindingsMap,
  AccessibilitySettings,
} from '../engine/InputManager';
import { touchHaptics } from '../engine/TouchHaptics';

interface KeyRemapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyRemapModal: React.FC<KeyRemapModalProps> = ({ isOpen, onClose }) => {
  const [bindings, setBindings] = useState<KeyBindingsMap>(inputManager.getBindings());
  const [settings, setSettings] = useState<AccessibilitySettings>(inputManager.getSettings());
  const [activeCategory, setActiveCategory] = useState<ActionCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recordingSlot, setRecordingSlot] = useState<{
    action: GameAction;
    slot: 'primary' | 'secondary';
  } | null>(null);

  // Live Test Bench State
  const [lastTestedKey, setLastTestedKey] = useState<{
    code: string;
    label: string;
    action: GameAction | null;
    actionName: string | null;
    timestamp: number;
  } | null>(null);

  // JSON Import/Export Drawer
  const [showJsonDrawer, setShowJsonDrawer] = useState<boolean>(false);
  const [jsonText, setJsonText] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const testBenchTimeoutRef = useRef<number | null>(null);

  // Subscribe to InputManager updates
  useEffect(() => {
    const unsub = inputManager.subscribe(() => {
      setBindings(inputManager.getBindings());
      setSettings(inputManager.getSettings());
    });
    return () => unsub();
  }, []);

  // Listen for key presses when recording or testing
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in text input unless in recording mode
      const isInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';

      if (recordingSlot) {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'Escape') {
          setRecordingSlot(null);
          touchHaptics.trigger('light_tap');
          return;
        }

        const normalizedCode = inputManager.normalizeEventCode(e);
        inputManager.setBinding(recordingSlot.action, recordingSlot.slot, normalizedCode);
        setRecordingSlot(null);
        touchHaptics.trigger('attack');
        return;
      }

      if (isInput) return;

      // Update Live Test Bench
      const normalizedCode = inputManager.normalizeEventCode(e);
      const action = inputManager.getActionForEvent(e);
      const actionDef = action ? ACTION_DEFINITIONS.find((a) => a.id === action) : null;

      setLastTestedKey({
        code: normalizedCode,
        label: inputManager.getKeyDisplayName(normalizedCode),
        action,
        actionName: actionDef?.name || null,
        timestamp: Date.now(),
      });

      if (testBenchTimeoutRef.current) {
        window.clearTimeout(testBenchTimeoutRef.current);
      }
      testBenchTimeoutRef.current = window.setTimeout(() => {
        setLastTestedKey((prev) => (prev ? { ...prev } : null));
      }, 1500);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (testBenchTimeoutRef.current) window.clearTimeout(testBenchTimeoutRef.current);
    };
  }, [isOpen, recordingSlot]);

  if (!isOpen) return null;

  const handleApplyPreset = (presetId: string) => {
    inputManager.applyPreset(presetId);
    touchHaptics.trigger('level_up');
    const preset = HARDWARE_PRESETS.find((p) => p.id === presetId);
    showFeedback(`Applied preset: ${preset?.name}`);
  };

  const handleResetDefaults = () => {
    inputManager.resetToDefaults();
    touchHaptics.trigger('light_tap');
    showFeedback('Reset all keybindings & accessibility settings to defaults.');
  };

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const filteredActions = ACTION_DEFINITIONS.filter((act) => {
    const matchesCategory = activeCategory === 'all' || act.category === activeCategory;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchesCategory;

    const slot = bindings[act.id];
    const primaryName = slot ? inputManager.getKeyDisplayName(slot.primary).toLowerCase() : '';
    const secondaryName = slot ? inputManager.getKeyDisplayName(slot.secondary).toLowerCase() : '';

    const matchesQuery =
      act.name.toLowerCase().includes(query) ||
      act.description.toLowerCase().includes(query) ||
      act.id.toLowerCase().includes(query) ||
      primaryName.includes(query) ||
      secondaryName.includes(query);

    return matchesCategory && matchesQuery;
  });

  const getCategoryBadge = (cat: ActionCategory) => {
    switch (cat) {
      case 'movement':
        return <span className="bg-sky-500/15 border border-sky-500/30 text-sky-400 px-2 py-0.5 rounded text-[10px] font-mono font-medium">Movement</span>;
      case 'interaction':
        return <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-mono font-medium">Interaction</span>;
      case 'combat':
        return <span className="bg-rose-500/15 border border-rose-500/30 text-rose-400 px-2 py-0.5 rounded text-[10px] font-mono font-medium">Combat</span>;
      case 'system':
        return <span className="bg-purple-500/15 border border-purple-500/30 text-purple-400 px-2 py-0.5 rounded text-[10px] font-mono font-medium">System</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 font-sans">
      <div className="bg-[#0F1219] border border-[#1F2937] rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-xs text-[#E5E7EB]">
        {/* Header */}
        <div className="bg-[#11141B] border-b border-[#1F2937] px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-serif italic text-emerald-100 flex items-center gap-2">
                <span>Neural Keymap & Accessible Input Remapper</span>
              </div>
              <div className="text-[11px] text-[#9CA3AF] font-sans">
                Customize movement, tactical interaction, and hardware layouts for ergonomic play.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setJsonText(inputManager.exportJSON());
                setShowJsonDrawer(!showJsonDrawer);
              }}
              className="px-2.5 py-1.5 bg-[#1A1E26] hover:bg-[#252A36] text-[#9CA3AF] hover:text-[#E5E7EB] border border-[#374151] rounded-md text-xs flex items-center gap-1.5 transition-colors font-medium"
              title="Backup / Restore Profiles"
            >
              <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="hidden sm:inline">Backup / JSON</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="px-2.5 py-1.5 bg-[#1A1E26] hover:bg-[#252A36] text-[#9CA3AF] hover:text-[#E5E7EB] border border-[#374151] rounded-md text-xs flex items-center gap-1.5 transition-colors font-medium"
              title="Restore factory default keybindings"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#FBBF24]" />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#1A1E26] text-[#9CA3AF] hover:text-[#E5E7EB] rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Pill */}
        {feedbackMsg && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Hardware Preset Bar */}
        <div className="bg-[#141822] border-b border-[#1F2937] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wider font-semibold flex items-center gap-1">
              <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Hardware Preset:</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {HARDWARE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset.id)}
                  className="px-2.5 py-1 bg-[#1A1E26] hover:bg-[#252A36] hover:border-emerald-500/50 border border-[#374151] rounded text-[11px] text-[#E5E7EB] transition-all flex items-center gap-1 font-medium"
                  title={preset.description}
                >
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* JSON Backup / Restore Drawer */}
        {showJsonDrawer && (
          <div className="bg-[#0A0D12] border-b border-[#1F2937] p-4 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-[#38BDF8] flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                <span>JSON Keymap Profile Import / Export</span>
              </span>
              <span className="text-[10px] text-[#9CA3AF]">Paste JSON below and click Import to restore custom keymaps.</span>
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full h-24 bg-[#080A0F] border border-[#374151] rounded-md p-2 text-[10px] font-mono text-emerald-400 outline-none focus:border-emerald-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(jsonText);
                  showFeedback('Keymap configuration copied to clipboard!');
                }}
                className="px-3 py-1.5 bg-[#1A1E26] hover:bg-[#252A36] border border-[#374151] text-[#E5E7EB] rounded text-xs font-medium"
              >
                Copy JSON
              </button>
              <button
                onClick={() => {
                  const success = inputManager.importJSON(jsonText);
                  if (success) {
                    showFeedback('Successfully imported custom keymap profile!');
                    setShowJsonDrawer(false);
                  } else {
                    showFeedback('Failed to parse JSON. Please check formatting.');
                  }
                }}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded text-xs uppercase tracking-wider"
              >
                Import Profile
              </button>
            </div>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="bg-[#11141B] border-b border-[#1F2937] px-4 py-2 flex flex-wrap items-center justify-between gap-2.5">
          {/* Categories */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeCategory === 'all'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1A1E26]'
              }`}
            >
              All Actions ({ACTION_DEFINITIONS.length})
            </button>
            <button
              onClick={() => setActiveCategory('movement')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeCategory === 'movement'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1A1E26]'
              }`}
            >
              Movement (4)
            </button>
            <button
              onClick={() => setActiveCategory('interaction')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeCategory === 'interaction'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1A1E26]'
              }`}
            >
              Interaction (4)
            </button>
            <button
              onClick={() => setActiveCategory('combat')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeCategory === 'combat'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1A1E26]'
              }`}
            >
              Combat (3)
            </button>
            <button
              onClick={() => setActiveCategory('system')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeCategory === 'system'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                  : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1A1E26]'
              }`}
            >
              System (5)
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actions or keys..."
              className="w-full bg-[#080A0F] border border-[#374151] rounded-md pl-8 pr-3 py-1 text-xs text-[#E5E7EB] outline-none focus:border-emerald-500 placeholder:text-[#6B7280]"
            />
          </div>
        </div>

        {/* Action Remapping List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {recordingSlot && (
            <div className="bg-emerald-500/10 border border-emerald-500 p-3 rounded-lg flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-emerald-400 animate-bounce" />
                <div>
                  <div className="font-semibold text-emerald-300">
                    Press any key to assign to:{' '}
                    <span className="underline font-bold">
                      {ACTION_DEFINITIONS.find((a) => a.id === recordingSlot.action)?.name} ({recordingSlot.slot})
                    </span>
                  </div>
                  <div className="text-[10px] text-[#9CA3AF]">Press [Escape] to cancel without changing.</div>
                </div>
              </div>
              <button
                onClick={() => setRecordingSlot(null)}
                className="px-2.5 py-1 bg-[#1A1E26] hover:bg-[#252A36] border border-[#374151] text-[#E5E7EB] rounded text-xs"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            {filteredActions.map((act) => {
              const slot = bindings[act.id] || { primary: '', secondary: '' };
              const primaryLabel = inputManager.getKeyDisplayName(slot.primary);
              const secondaryLabel = inputManager.getKeyDisplayName(slot.secondary);

              const isRecordingPrimary = recordingSlot?.action === act.id && recordingSlot?.slot === 'primary';
              const isRecordingSecondary = recordingSlot?.action === act.id && recordingSlot?.slot === 'secondary';

              // Check for conflict warnings
              const primaryConflicts = slot.primary ? inputManager.findConflicts(slot.primary, act.id) : [];
              const secondaryConflicts = slot.secondary ? inputManager.findConflicts(slot.secondary, act.id) : [];

              return (
                <div
                  key={act.id}
                  className="bg-[#1A1E26] border border-[#374151] hover:border-[#4B5563] p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  {/* Left: Info */}
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-serif italic text-sm text-[#F3F4F6] font-medium">{act.name}</span>
                      {getCategoryBadge(act.category)}
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-relaxed">{act.description}</p>

                    {/* Conflict Warnings */}
                    {(primaryConflicts.length > 0 || secondaryConflicts.length > 0) && (
                      <div className="flex items-center gap-1.5 text-[10px] text-[#FBBF24] mt-1">
                        <AlertTriangle className="w-3 h-3 text-[#FBBF24] shrink-0" />
                        <span>
                          Overlap:{' '}
                          {[...primaryConflicts, ...secondaryConflicts]
                            .map((c) => ACTION_DEFINITIONS.find((a) => a.id === c)?.name || c)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Key Slots */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {/* Primary Slot */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setRecordingSlot({ action: act.id, slot: 'primary' });
                          touchHaptics.trigger('light_tap');
                        }}
                        className={`min-w-24 px-3 py-1.5 rounded-md border font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isRecordingPrimary
                            ? 'bg-emerald-500 text-black border-white shadow-[0_0_12px_rgba(16,185,129,0.7)] animate-pulse'
                            : slot.primary
                            ? 'bg-[#11141B] border-emerald-500/40 text-emerald-300 hover:border-emerald-500'
                            : 'bg-[#11141B] border-dashed border-[#4B5563] text-[#6B7280] hover:text-[#9CA3AF]'
                        }`}
                      >
                        <span>{isRecordingPrimary ? 'Press Key...' : primaryLabel}</span>
                      </button>

                      {slot.primary && (
                        <button
                          onClick={() => {
                            inputManager.clearBinding(act.id, 'primary');
                            touchHaptics.trigger('light_tap');
                          }}
                          className="p-1 hover:bg-[#252A36] text-[#9CA3AF] hover:text-[#EF4444] rounded"
                          title="Clear Primary Key"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <span className="text-[#6B7280] font-mono text-[10px]">or</span>

                    {/* Secondary Slot */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setRecordingSlot({ action: act.id, slot: 'secondary' });
                          touchHaptics.trigger('light_tap');
                        }}
                        className={`min-w-24 px-3 py-1.5 rounded-md border font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isRecordingSecondary
                            ? 'bg-emerald-500 text-black border-white shadow-[0_0_12px_rgba(16,185,129,0.7)] animate-pulse'
                            : slot.secondary
                            ? 'bg-[#11141B] border-[#38BDF8]/40 text-[#38BDF8] hover:border-[#38BDF8]'
                            : 'bg-[#11141B] border-dashed border-[#4B5563] text-[#6B7280] hover:text-[#9CA3AF]'
                        }`}
                      >
                        <span>{isRecordingSecondary ? 'Press Key...' : secondaryLabel}</span>
                      </button>

                      {slot.secondary && (
                        <button
                          onClick={() => {
                            inputManager.clearBinding(act.id, 'secondary');
                            touchHaptics.trigger('light_tap');
                          }}
                          className="p-1 hover:bg-[#252A36] text-[#9CA3AF] hover:text-[#EF4444] rounded"
                          title="Clear Secondary Key"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredActions.length === 0 && (
              <div className="text-center py-8 text-[#9CA3AF] bg-[#141822] rounded-lg border border-[#374151]">
                No actions found matching "{searchQuery}".
              </div>
            )}
          </div>

          {/* Accessibility Tuning Panel */}
          <div className="bg-[#141822] border border-[#374151] p-3.5 rounded-lg space-y-3 mt-4">
            <div className="font-serif italic text-sm text-[#FBBF24] flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 not-italic" />
              <span>Accessibility & Motor Responsiveness Controls</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Input Repeat Delay */}
              <div className="bg-[#1A1E26] border border-[#374151] p-2.5 rounded-md space-y-1.5">
                <label className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-semibold block">
                  Input Repeat Throttle
                </label>
                <div className="flex items-center gap-1.5">
                  {[
                    { label: 'Raw (0ms)', val: 0 },
                    { label: 'Responsive (60ms)', val: 60 },
                    { label: 'Moderate (120ms)', val: 120 },
                    { label: 'Relaxed (220ms)', val: 220 },
                  ].map((rate) => (
                    <button
                      key={rate.val}
                      onClick={() => inputManager.updateSettings({ inputThrottleMs: rate.val })}
                      className={`flex-1 py-1 rounded text-[10px] font-mono border transition-all ${
                        settings.inputThrottleMs === rate.val
                          ? 'bg-emerald-500 text-black border-emerald-400 font-bold shadow-sm'
                          : 'bg-[#11141B] border-[#374151] text-[#9CA3AF] hover:text-[#E5E7EB]'
                      }`}
                    >
                      {rate.label}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-[#6B7280]">
                  Prevents accidental multiple triggers when holding down a key.
                </div>
              </div>

              {/* Toggles */}
              <div className="bg-[#1A1E26] border border-[#374151] p-2.5 rounded-md space-y-2 flex flex-col justify-center">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[#E5E7EB]">Haptic Motor Feedback on Keypress</span>
                  <input
                    type="checkbox"
                    checked={settings.hapticFeedback}
                    onChange={(e) => inputManager.updateSettings({ hapticFeedback: e.target.checked })}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[#E5E7EB]">High Contrast Key Display Chips</span>
                  <input
                    type="checkbox"
                    checked={settings.highContrastKeyLabels}
                    onChange={(e) => inputManager.updateSettings({ highContrastKeyLabels: e.target.checked })}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Live Keypress Test Bench Footer */}
        <div className="bg-[#11141B] border-t border-[#1F2937] p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
            <div>
              <span className="text-[#9CA3AF] text-[10px] uppercase tracking-wider block font-semibold">
                Live Keypress Test Bench:
              </span>
              {lastTestedKey ? (
                <div className="flex items-center gap-2 font-mono mt-0.5">
                  <span className="bg-black/50 border border-emerald-500/50 text-emerald-300 px-2 py-0.5 rounded font-bold">
                    {lastTestedKey.label} ({lastTestedKey.code})
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  {lastTestedKey.action ? (
                    <span className="text-[#38BDF8] font-semibold">
                      Triggers: <span className="underline">{lastTestedKey.actionName}</span>
                    </span>
                  ) : (
                    <span className="text-[#6B7280] italic">(No action mapped to this key)</span>
                  )}
                </div>
              ) : (
                <span className="text-[#6B7280] italic font-mono text-[11px]">
                  (Press any key on your keyboard to test responses in real-time)
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-md text-xs transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)] uppercase tracking-wider"
          >
            Save & Return to Engine
          </button>
        </div>
      </div>
    </div>
  );
};
