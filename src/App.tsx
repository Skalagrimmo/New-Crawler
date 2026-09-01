import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Layers,
  Database,
  Smartphone,
  FileCode,
  Volume2,
  VolumeX,
  RefreshCw,
  Terminal,
  Shield,
  Zap,
  Radio,
  Cpu,
  Package,
  Award,
  Crosshair,
  Settings,
  Flame,
  Search,
  Key,
  Keyboard,
  Save,
  HardDrive,
} from 'lucide-react';
import { assetManager } from './engine/AssetManager';
import { audioSynth } from './engine/AudioSynth';
import { ParticleEngine } from './engine/ParticleEngine';
import { PLATFORM_PROFILES } from './engine/PlatformProfiles';
import { SpriteBatcher } from './engine/SpriteBatcher';
import { touchHaptics } from './engine/TouchHaptics';
import { PlatformTarget, ProfilerStats } from './engine/types';
import { inputManager } from './engine/InputManager';
import { GAME_ITEMS } from './game/Entities';
import { gameCore } from './game/GameCore';
import { saveManager } from './game/SaveManager';
import { AndroidBuildPipelineModal } from './components/AndroidBuildPipelineModal';
import { AssetInspectorModal } from './components/AssetInspectorModal';
import { BatchInspectorModal } from './components/BatchInspectorModal';
import { CharacterSelectModal } from './components/CharacterSelectModal';
import { GameCanvas } from './components/GameCanvas';
import { KeyRemapModal } from './components/KeyRemapModal';
import { PascalSourceViewer } from './components/PascalSourceViewer';
import { PerformanceHUD } from './components/PerformanceHUD';
import { SaveLoadModal } from './components/SaveLoadModal';

export default function App() {
  const [targetPlatform, setTargetPlatform] = useState<PlatformTarget>('android');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showAssetInspector, setShowAssetInspector] = useState<boolean>(false);
  const [showBatchInspector, setShowBatchInspector] = useState<boolean>(false);
  const [showAndroidPipeline, setShowAndroidPipeline] = useState<boolean>(false);
  const [showPascalViewer, setShowPascalViewer] = useState<boolean>(false);
  const [showCharSelect, setShowCharSelect] = useState<boolean>(false);
  const [showKeyRemap, setShowKeyRemap] = useState<boolean>(false);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number | null>(saveManager.getLastSavedTimestamp());
  const [isDeviceSimulator, setIsDeviceSimulator] = useState<boolean>(false);
  const [enableCRT, setEnableCRT] = useState<boolean>(false);
  const [cmdInput, setCmdInput] = useState<string>('');

  // Engine Subsystems
  const particleEngineRef = useRef<ParticleEngine>(new ParticleEngine(300));
  const spriteBatcherRef = useRef<SpriteBatcher>(new SpriteBatcher(assetManager, 2048));

  // Profiler Stats
  const [stats, setStats] = useState<ProfilerStats>({
    fps: 60,
    frameTimeMs: 16.6,
    drawCalls: 4,
    spritesRendered: 120,
    batchesCount: 4,
    textureSwitches: 2,
    inputLatencyMs: 0.4,
    memoryUsedMB: 1.0,
    memoryMaxMB: 48.0,
    hapticsTriggered: 0,
    activeParticles: 0,
  });

  // Re-render trigger on gameCore state updates
  const [, setTick] = useState<number>(0);

  useEffect(() => {
    const unsubCore = gameCore.subscribe(() => {
      setTick((t) => t + 1);
    });
    const unsubSave = saveManager.subscribe(() => {
      setLastSavedTimestamp(saveManager.getLastSavedTimestamp());
    });
    return () => {
      unsubCore();
      unsubSave();
    };
  }, []);

  // Update engine configurations when platform changes
  const handlePlatformChange = (platform: PlatformTarget) => {
    setTargetPlatform(platform);
    const profile = PLATFORM_PROFILES[platform];
    assetManager.setMaxMemoryMB(profile.maxMemoryMB);
    spriteBatcherRef.current.setCapacity(profile.batchCapacity);
    particleEngineRef.current.setCapacity(profile.particleLimit);
    setEnableCRT(profile.enableCRTShader);
    touchHaptics.setHapticsEnabled(profile.enableHaptics);
    touchHaptics.trigger('light_tap');
    gameCore.log(`Engine profile switched to [${profile.name}] (Max VRAM: ${profile.maxMemoryMB}MB, Batch Cap: ${profile.batchCapacity})`, 'sys');
  };

  const handleToggleMute = () => {
    const muted = audioSynth.toggleMute();
    setIsMuted(muted);
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = cmdInput.trim();
    if (!raw) return;
    setCmdInput('');

    const parts = raw.toLowerCase().split(/\s+/);
    const cmd = parts[0];
    const arg = parts.slice(1).join(' ');

    gameCore.log(`netcrawler> ${raw}`, 'sys');

    if (gameCore.inCombat) {
      switch (cmd) {
        case 'attack':
        case 'strike':
          gameCore.attack();
          return;
        case 'defend':
          gameCore.defend();
          return;
        case 'hack':
          gameCore.startTerminalHack('combat');
          return;
        case 'scan':
          gameCore.scan();
          return;
        case 'flee':
          gameCore.flee();
          return;
        case 'use':
          gameCore.useItem(arg);
          return;
        default:
          gameCore.log('In combat: type attack, defend, hack, scan, flee, use <item>', 'sys');
          return;
      }
    }

    switch (cmd) {
      case 'w':
      case 'up':
      case 'north':
        gameCore.move(0, -1);
        break;
      case 's':
      case 'down':
      case 'south':
        gameCore.move(0, 1);
        break;
      case 'a':
      case 'left':
      case 'west':
        gameCore.move(-1, 0);
        break;
      case 'd':
      case 'right':
      case 'east':
        gameCore.move(1, 0);
        break;
      case 'e':
      case 'interact':
        gameCore.interact();
        break;
      case 'use':
        gameCore.useItem(arg);
        break;
      case 'equip':
        gameCore.equip(arg);
        break;
      case 'scan':
        gameCore.log(`Standing on node: [${gameCore.world.getTile(gameCore.playerPos.x, gameCore.playerPos.y)}]`, 'sys');
        break;
      case 'restart':
        setShowCharSelect(true);
        break;
      case 'save':
        gameCore.saveToStorage('netcrawler_save_primary', 'Manual Terminal Sync');
        break;
      case 'quicksave':
        gameCore.saveToStorage('netcrawler_save_quicksave', 'QuickSave Checkpoint');
        break;
      case 'load':
        gameCore.loadFromStorage('netcrawler_save_primary');
        break;
      case 'quickload':
        gameCore.loadFromStorage('netcrawler_save_quicksave');
        break;
      case 'saves':
      case 'slots':
      case 'storage':
        setShowSaveModal(true);
        break;
      case 'clearsave':
        gameCore.clearSavedState('netcrawler_save_primary');
        break;
      case 'keymap':
      case 'keys':
      case 'controls':
      case 'remap':
        setShowKeyRemap(true);
        break;
      case 'help':
        gameCore.log('Commands: w/a/s/d (move), e (interact), scan, use <item>, equip <item>, save, load, saves, keys (remap), restart, help', 'sys');
        break;
      default:
        gameCore.log(`Unknown command: '${cmd}'. Type 'help' for instructions.`, 'sys');
        break;
    }
  };

  // Keyboard navigation & semantic action listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      // Handle F5 QuickSave and F9 QuickLoad
      if (e.key === 'F5') {
        e.preventDefault();
        gameCore.saveToStorage('netcrawler_save_quicksave', 'QuickSave [F5]');
        return;
      }
      if (e.key === 'F9') {
        e.preventDefault();
        gameCore.loadFromStorage('netcrawler_save_quicksave');
        return;
      }

      const action = inputManager.getActionForEvent(e);
      if (!action) return;

      // Prevent default for page scrolling keys when in game
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code) || e.key === ' ') {
        e.preventDefault();
      }

      switch (action) {
        case 'move_up':
          gameCore.move(0, -1);
          break;
        case 'move_down':
          gameCore.move(0, 1);
          break;
        case 'move_left':
          gameCore.move(-1, 0);
          break;
        case 'move_right':
          gameCore.move(1, 0);
          break;
        case 'interact':
          gameCore.interact();
          break;
        case 'attack':
          if (gameCore.inCombat) {
            gameCore.attack();
          } else {
            gameCore.interact();
          }
          break;
        case 'defend':
          if (gameCore.inCombat) {
            gameCore.defend();
          }
          break;
        case 'combat_hack':
          if (gameCore.inCombat) {
            gameCore.startTerminalHack('combat');
          } else {
            gameCore.interact();
          }
          break;
        case 'scan':
          const current = gameCore.world.getTile(gameCore.playerPos.x, gameCore.playerPos.y);
          gameCore.log(`[SCANNER] Standing on: [${current}] (X:${gameCore.playerPos.x}, Y:${gameCore.playerPos.y})`, 'sys');
          audioSynth.playLaser(750, 0.08);
          touchHaptics.trigger('light_tap');
          break;
        case 'quick_item_1':
          gameCore.useItem('nanomed');
          break;
        case 'quick_item_2':
          gameCore.useItem('ram_boost');
          break;
        case 'toggle_crt':
          setEnableCRT((prev) => !prev);
          touchHaptics.trigger('light_tap');
          break;
        case 'toggle_mute':
          handleToggleMute();
          break;
        case 'open_keymap':
          setShowKeyRemap(true);
          break;
        case 'open_character_select':
          setShowCharSelect(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const p = gameCore.player;
  const currentProfile = PLATFORM_PROFILES[targetPlatform];

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#E5E7EB] font-sans flex flex-col antialiased selection:bg-emerald-500/30">
      {/* Top Application Bar */}
      <header className="h-14 bg-[#11141B] border-b border-[#1F2937] px-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center text-black font-bold font-mono text-sm shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            P
          </div>
          <div>
            <div className="flex items-center">
              <span className="font-serif italic text-base sm:text-lg tracking-wide text-emerald-100">
                Pascal.Engine
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#9CA3AF] ml-2">
                NetCrawler 2D
              </span>
            </div>
            <div className="text-[10px] text-[#6B7280] flex items-center gap-2 -mt-0.5">
              <span>Modular Sprite Architecture</span>
              <span>•</span>
              <span className="text-emerald-400 font-mono font-medium uppercase">
                {gameCore.zone} : Floor {gameCore.floor}
              </span>
            </div>
          </div>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Target Profile pill */}
          <div className="hidden sm:flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded border border-[#374151] text-[10px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
            <span className="text-[#9CA3AF] uppercase tracking-wider">Target:</span>
            <select
              value={targetPlatform}
              onChange={(e) => handlePlatformChange(e.target.value as PlatformTarget)}
              className="bg-transparent text-emerald-400 font-mono font-medium outline-none cursor-pointer"
            >
              <option value="android" className="bg-[#11141B] text-[#E5E7EB]">Android NDK (ARM64)</option>
              <option value="ios" className="bg-[#11141B] text-[#E5E7EB]">iOS Native PWA</option>
              <option value="desktop" className="bg-[#11141B] text-[#E5E7EB]">Desktop 4K</option>
              <option value="raspberry_pi" className="bg-[#11141B] text-[#E5E7EB]">Raspberry Pi 4</option>
            </select>
          </div>

          <button
            onClick={() => setShowCharSelect(true)}
            className="px-2.5 py-1.5 bg-[#1A1E26] hover:bg-[#252A36] text-[#E5E7EB] border border-[#374151] hover:border-emerald-500/40 rounded text-xs flex items-center gap-1.5 transition-colors font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Runner</span>
          </button>

          <button
            onClick={() => setShowKeyRemap(true)}
            className="px-2.5 py-1.5 bg-[#1A1E26] hover:bg-[#252A36] text-[#E5E7EB] border border-[#374151] hover:border-emerald-500/40 rounded text-xs flex items-center gap-1.5 transition-colors font-medium"
            title="Configure Keyboard Remapping & Accessibility [F1]"
          >
            <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Keymap</span>
          </button>

          <button
            onClick={() => setShowPascalViewer(true)}
            className="px-2.5 py-1.5 bg-[#1A1E26] hover:bg-[#252A36] text-[#E5E7EB] border border-[#374151] hover:border-emerald-500/40 rounded text-xs flex items-center gap-1.5 transition-colors font-medium"
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Pascal Source</span>
          </button>

          <button
            onClick={() => setShowAssetInspector(true)}
            className="px-2.5 py-1.5 bg-[#1A1E26] hover:bg-[#252A36] text-[#E5E7EB] border border-[#374151] hover:border-[#38BDF8]/40 rounded text-xs flex items-center gap-1.5 transition-colors font-medium"
          >
            <Database className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="hidden md:inline">Asset Pool</span>
          </button>

          <button
            onClick={() => setShowBatchInspector(true)}
            className="px-2.5 py-1.5 bg-[#1A1E26] hover:bg-[#252A36] text-[#E5E7EB] border border-[#374151] hover:border-[#A78BFA]/40 rounded text-xs flex items-center gap-1.5 transition-colors font-medium"
          >
            <Layers className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span className="hidden md:inline">Batcher</span>
          </button>

          <button
            onClick={() => setShowAndroidPipeline(true)}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded text-xs flex items-center gap-1.5 transition-colors shadow-[0_0_12px_rgba(16,185,129,0.25)] uppercase tracking-wider"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android Pipeline</span>
          </button>

          <button
            onClick={() => setIsDeviceSimulator(!isDeviceSimulator)}
            className={`px-2.5 py-1.5 border rounded text-xs flex items-center gap-1.5 transition-colors font-medium ${
              isDeviceSimulator
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/50'
                : 'bg-[#1A1E26] hover:bg-[#252A36] text-[#9CA3AF] hover:text-[#E5E7EB] border-[#374151]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Device View</span>
          </button>

          {/* Audio Synthesizer Mute Button */}
          <button
            onClick={handleToggleMute}
            className="p-1.5 bg-[#1A1E26] hover:bg-[#252A36] border border-[#374151] hover:border-emerald-500/40 text-[#9CA3AF] hover:text-[#E5E7EB] rounded transition-colors"
            title={isMuted ? 'Unmute Audio Synthesizer' : 'Mute Audio Synthesizer'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-[#EF4444]" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-7xl mx-auto w-full">
        {/* LEFT COLUMN: Player Status & Vitals (4 Cols on LG) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Runner Vital HUD Card */}
          <div className="bg-[#0F1219] border border-[#1F2937] p-3.5 rounded-lg space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
              <div>
                <div className="font-serif italic text-base text-emerald-100">{p.name}</div>
                <div className="text-[11px] text-[#9CA3AF] font-sans">
                  Class: <span className="text-[#E5E7EB] font-medium">{p.className}</span> • Level {p.level}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-[#FBBF24]">{p.credits} MB</span>
                <div className="text-[10px] text-[#A78BFA] font-mono">{p.dataFragments} Frags</div>
              </div>
            </div>

            {/* Integrity (HP) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#9CA3AF]">Integrity (HP)</span>
                <span className="font-mono font-semibold text-[#E5E7EB]">{p.hp}/{p.maxHp}</span>
              </div>
              <div className="w-full bg-[#080A0F] h-2 rounded-full border border-[#374151] overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-700 to-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${Math.max(0, (p.hp / p.maxHp) * 100)}%` }}
                />
              </div>
            </div>

            {/* Shield Matrix */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#9CA3AF]">Shield Matrix</span>
                <span className="font-mono font-semibold text-[#38BDF8]">{p.shield}/{p.maxShield}</span>
              </div>
              <div className="w-full bg-[#080A0F] h-2 rounded-full border border-[#374151] overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-700 to-[#38BDF8] h-full transition-all duration-300"
                  style={{ width: `${Math.max(0, (p.shield / p.maxShield) * 100)}%` }}
                />
              </div>
            </div>

            {/* RAM Buffer */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#9CA3AF]">RAM Buffer</span>
                <span className="font-mono font-semibold text-[#A78BFA]">{p.ram}/{p.maxRam}</span>
              </div>
              <div className="w-full bg-[#080A0F] h-2 rounded-full border border-[#374151] overflow-hidden">
                <div
                  className="bg-gradient-to-r from-violet-700 to-[#A78BFA] h-full transition-all duration-300"
                  style={{ width: `${Math.max(0, (p.ram / p.maxRam) * 100)}%` }}
                />
              </div>
            </div>

            {/* XP Bar */}
            <div>
              <div className="flex justify-between text-[10px] text-[#6B7280] mb-1">
                <span>XP Progression</span>
                <span className="font-mono">{p.xp}/{p.xpToNext}</span>
              </div>
              <div className="w-full bg-[#080A0F] h-1.5 rounded-full border border-[#374151] overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-700 to-[#FBBF24] h-full transition-all"
                  style={{ width: `${Math.max(0, (p.xp / p.xpToNext) * 100)}%` }}
                />
              </div>
            </div>

            {/* Gear Slots */}
            <div className="pt-2 border-t border-[#1F2937] grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-[#1A1E26] border border-[#374151] p-2 rounded-md">
                <span className="text-[#6B7280] block uppercase text-[9px] tracking-wider">Active Weapon</span>
                <span className="font-medium text-[#38BDF8] truncate block mt-0.5">
                  {GAME_ITEMS[p.equipment.weapon]?.name || 'Unarmed'}
                </span>
              </div>
              <div className="bg-[#1A1E26] border border-[#374151] p-2 rounded-md">
                <span className="text-[#6B7280] block uppercase text-[9px] tracking-wider">Sub-dermal Armor</span>
                <span className="font-medium text-emerald-400 truncate block mt-0.5">
                  {GAME_ITEMS[p.equipment.armor]?.name || 'Standard'}
                </span>
              </div>
            </div>
          </div>

          {/* Inventory & Consumables */}
          <div className="bg-[#0F1219] border border-[#1F2937] p-3.5 rounded-lg space-y-2.5 flex-1 shadow-md flex flex-col">
            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-semibold flex items-center justify-between border-b border-[#1F2937] pb-1.5">
              <div className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cyberdeck Inventory</span>
              </div>
              <span className="text-[#6B7280] font-mono">{Object.keys(p.inventory).length} Items</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto flex-1 pr-1">
              {Object.entries(p.inventory).map(([itemId, qty]) => {
                const def = GAME_ITEMS[itemId];
                if (!def || qty <= 0) return null;

                return (
                  <div
                    key={itemId}
                    onClick={() => gameCore.useItem(itemId)}
                    className="p-2 bg-[#1A1E26] hover:bg-[#252A36] border border-[#374151] hover:border-emerald-500/40 rounded-md flex items-center justify-between cursor-pointer transition-colors text-xs"
                  >
                    <div className="truncate pr-2">
                      <div className="font-medium text-[#E5E7EB] truncate">{def.name}</div>
                      <div className="text-[10px] text-[#9CA3AF] truncate mt-0.5">{def.desc}</div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      <span className="bg-black/40 text-emerald-400 border border-[#374151] px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                        x{qty}
                      </span>
                    </div>
                  </div>
                );
              })}

              {Object.keys(p.inventory).length === 0 && (
                <div className="text-center py-6 text-[#6B7280] text-xs">
                  (Inventory empty — breach nodes to extract data packs)
                </div>
              )}
            </div>

            {/* Programs List */}
            <div className="pt-2 border-t border-[#1F2937]">
              <div className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-[#A78BFA]" />
                <span>Installed Kernels ({p.programs.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {p.programs.map((prog, idx) => (
                  <span
                    key={idx}
                    className="bg-[#1A1E26] border border-[#374151] text-[#A78BFA] text-[10px] font-mono px-2 py-0.5 rounded"
                  >
                    {prog}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER & RIGHT COLUMN: Viewport, Hacking Terminal & Log Feed (8 Cols on LG) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Live Performance HUD */}
          <PerformanceHUD stats={stats} platformName={currentProfile.name} />

          {/* Dual-Mode Canvas Viewport & Touch Controller */}
          <GameCanvas
            gameCore={gameCore}
            particleEngine={particleEngineRef.current}
            spriteBatcher={spriteBatcherRef.current}
            onUpdateStats={setStats}
            enableCRT={enableCRT}
            touchControllerStyle={currentProfile.touchControllerStyle}
            isDeviceSimulator={isDeviceSimulator}
            onOpenKeymap={() => setShowKeyRemap(true)}
          />

          {/* Breach Protocol Interactive Hack Grid (Shown during hacking) */}
          {gameCore.hackState && (
            <div className="bg-[#0F1219] border border-[#38BDF8]/60 p-3.5 rounded-lg shadow-lg space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                <div className="flex items-center gap-2 text-[#38BDF8] font-bold text-xs tracking-wider uppercase">
                  <Radio className="w-4 h-4 animate-spin text-[#38BDF8]" />
                  <span>Breach Protocol // Hex Buffer Matrix</span>
                </div>
                <div className="text-xs text-[#FBBF24] font-mono font-medium">
                  Buffer: {gameCore.hackState.buffer.length}/{gameCore.hackState.bufferLimit}
                </div>
              </div>

              {/* Target Sequence */}
              <div className="bg-[#1A1E26] border border-[#374151] p-2 rounded-md flex items-center justify-between text-xs">
                <span className="text-[#9CA3AF] text-[11px] uppercase">Target Sequence:</span>
                <div className="flex items-center gap-1.5">
                  {gameCore.hackState.target.map((sym, idx) => (
                    <span
                      key={idx}
                      className="bg-black/40 border border-[#FBBF24]/60 text-[#FBBF24] px-2 py-0.5 rounded font-mono font-bold"
                    >
                      {sym}
                    </span>
                  ))}
                </div>
              </div>

              {/* Grid Cells */}
              <div className="flex flex-col items-center gap-1.5 py-1">
                {gameCore.hackState.grid.map((row, r) => (
                  <div key={r} className="flex gap-1.5">
                    {row.map((sym, c) => {
                      const isSelected =
                        gameCore.hackState?.lastPos.r === r && gameCore.hackState?.lastPos.c === c;
                      return (
                        <button
                          key={c}
                          onClick={() => gameCore.pickHackCell(r, c)}
                          className={`w-9 h-9 sm:w-11 sm:h-11 rounded-md border font-mono font-bold text-sm sm:text-base flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-[#38BDF8] text-black border-[#ffffff] shadow-[0_0_12px_rgba(56,189,248,0.8)] scale-105'
                              : 'bg-[#1A1E26] border-[#374151] text-[#E5E7EB] hover:border-[#38BDF8] hover:bg-[#252A36]'
                          }`}
                        >
                          {sym}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Current Buffer */}
              <div className="bg-[#1A1E26] border border-[#374151] p-2 rounded-md flex items-center justify-between text-xs font-mono">
                <span className="text-[#9CA3AF] text-[11px] uppercase font-sans">Active Buffer:</span>
                <div className="flex items-center gap-1">
                  {gameCore.hackState.buffer.map((b, idx) => (
                    <span
                      key={idx}
                      className="bg-black/40 border border-[#A78BFA] text-[#A78BFA] px-1.5 py-0.5 rounded text-xs font-bold"
                    >
                      {b}
                    </span>
                  ))}
                  {gameCore.hackState.buffer.length === 0 && (
                    <span className="text-[#6B7280] italic text-xs font-sans">(Select byte from active row)</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Combat Overlay Bar (When actively in battle) */}
          {gameCore.inCombat && gameCore.activeEnemy && (
            <div className="bg-[#0F1219] border border-[#EF4444]/60 p-3.5 rounded-lg space-y-2 shadow-lg animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-serif italic text-base text-[#EF4444]">{gameCore.activeEnemy.name}</div>
                  <div className="text-[11px] text-[#9CA3AF]">
                    Armor: {gameCore.activeEnemy.armor} • Strike DMG: {gameCore.activeEnemy.dmg}
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-[#EF4444] text-sm">
                  {gameCore.activeEnemy.hp}/{gameCore.activeEnemy.maxHp} HP
                </div>
              </div>

              <div className="w-full bg-[#080A0F] h-2 rounded-full border border-[#374151] overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#EF4444] to-[#FBBF24] h-full transition-all duration-200"
                  style={{
                    width: `${Math.max(0, (gameCore.activeEnemy.hp / gameCore.activeEnemy.maxHp) * 100)}%`,
                  }}
                />
              </div>

              {/* Enemy Status Badges */}
              {gameCore.activeEnemy.statusEffects.length > 0 && (
                <div className="flex gap-1.5 pt-1">
                  {gameCore.activeEnemy.statusEffects.map((st, idx) => (
                    <span
                      key={idx}
                      className="bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444] text-[10px] px-2 py-0.5 rounded font-medium"
                    >
                      {st.type} ({st.turns} turn)
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Live Game Event Feed */}
          <div className="bg-[#0F1219] border border-[#1F2937] rounded-lg p-3.5 flex flex-col flex-1 shadow-md min-h-48">
            <div className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold mb-2 flex items-center justify-between border-b border-[#1F2937] pb-1.5">
              <span>Terminal Telemetry & Event Log</span>
              <span className="text-emerald-400 font-mono">120Hz Engine Loop</span>
            </div>

            <div className="flex-1 max-h-44 overflow-y-auto space-y-1 text-xs font-mono pr-1">
              {gameCore.logs.map((log) => (
                <div
                  key={log.id}
                  className={`leading-relaxed ${
                    log.type === 'combat'
                      ? 'text-[#FBBF24]'
                      : log.type === 'hack'
                      ? 'text-[#38BDF8]'
                      : log.type === 'loot'
                      ? 'text-emerald-400 font-medium'
                      : log.type === 'boss'
                      ? 'text-[#A78BFA] font-bold'
                      : log.type === 'danger'
                      ? 'text-[#EF4444] font-medium'
                      : 'text-[#9CA3AF]'
                  }`}
                >
                  {log.text}
                </div>
              ))}
            </div>

            {/* CLI Command Prompt */}
            <form
              onSubmit={handleCommandSubmit}
              className="mt-3 pt-2.5 border-t border-[#1F2937] flex items-center gap-2"
            >
              <span className="text-emerald-400 font-mono font-bold text-xs select-none">netcrawler&gt;</span>
              <input
                type="text"
                value={cmdInput}
                onChange={(e) => setCmdInput(e.target.value)}
                placeholder="type command (e.g. 'attack', 'hack', 'w', 'scan', 'use nanomed', 'help')..."
                className="flex-1 bg-[#080A0F] border border-[#374151] focus:border-emerald-500 text-[#E5E7EB] text-xs px-2.5 py-1 rounded outline-none font-mono placeholder:text-[#6B7280]"
              />
              <button
                type="submit"
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded text-xs transition-colors uppercase tracking-wider"
              >
                EXEC
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Modals & Inspectors */}
      <AssetInspectorModal
        isOpen={showAssetInspector}
        onClose={() => setShowAssetInspector(false)}
      />

      <BatchInspectorModal
        isOpen={showBatchInspector}
        onClose={() => setShowBatchInspector(false)}
        stats={spriteBatcherRef.current.getStats()}
        batches={spriteBatcherRef.current.getBatches()}
      />

      <AndroidBuildPipelineModal
        isOpen={showAndroidPipeline}
        onClose={() => setShowAndroidPipeline(false)}
        onActivateDeviceSimulator={() => setIsDeviceSimulator(true)}
      />

      <PascalSourceViewer
        isOpen={showPascalViewer}
        onClose={() => setShowPascalViewer(false)}
      />

      <CharacterSelectModal
        isOpen={showCharSelect}
        onConfirm={(className, runnerName, kit) => {
          gameCore.restartGame(className, runnerName);
          setShowCharSelect(false);
        }}
      />

      <KeyRemapModal
        isOpen={showKeyRemap}
        onClose={() => setShowKeyRemap(false)}
      />
    </div>
  );
}

