import React, { useState } from 'react';
import { Shield, Zap, Sparkles, Terminal, ArrowRight, UserCheck } from 'lucide-react';
import { PLAYER_CLASSES } from '../game/Entities';
import { touchHaptics } from '../engine/TouchHaptics';

interface CharacterSelectModalProps {
  isOpen: boolean;
  onConfirm: (className: string, runnerName: string, kit: string) => void;
}

export const CharacterSelectModal: React.FC<CharacterSelectModalProps> = ({ isOpen, onConfirm }) => {
  const [selectedClass, setSelectedClass] = useState<string>('NETRUNNER');
  const [runnerName, setRunnerName] = useState<string>('VEX_77');
  const [selectedKit, setSelectedKit] = useState<string>('STANDARD');

  if (!isOpen) return null;

  const handleSelect = (key: string) => {
    setSelectedClass(key);
    touchHaptics.trigger('light_tap');
  };

  const handleLaunch = () => {
    touchHaptics.trigger('level_up');
    onConfirm(selectedClass, runnerName.trim() || 'VEX_77', selectedKit);
  };

  const cls = PLAYER_CLASSES[selectedClass] || PLAYER_CLASSES.NETRUNNER;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 font-sans">
      <div className="bg-[#0F1219] border border-[#1F2937] rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs text-[#E5E7EB]">
        {/* Header */}
        <div className="bg-[#11141B] border-b border-[#1F2937] px-5 py-4 text-center">
          <div className="text-lg font-serif italic text-emerald-100 tracking-wide flex items-center justify-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400 not-italic" />
            <span>Runner Initialization Protocol</span>
          </div>
          <div className="text-xs text-[#9CA3AF] mt-1 font-sans">
            Configure your cyberdeck, neural archetype, and loadout parameters.
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Runner Name Input */}
          <div>
            <label className="text-[10px] text-[#9CA3AF] uppercase block mb-1 font-semibold tracking-wider">
              Runner Call-Sign
            </label>
            <input
              type="text"
              value={runnerName}
              onChange={(e) => setRunnerName(e.target.value)}
              placeholder="e.g. VEX_77, CIPHER_09, NYX_99"
              className="w-full bg-[#080A0F] border border-[#374151] text-emerald-400 font-mono font-bold p-2.5 rounded-md outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          {/* Class Archetype Grid */}
          <div>
            <label className="text-[10px] text-[#9CA3AF] uppercase block mb-2 font-semibold tracking-wider">
              Select Neural Class Archetype
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.entries(PLAYER_CLASSES).map(([key, item]) => (
                <div
                  key={key}
                  onClick={() => handleSelect(key)}
                  className={`p-3 rounded-md border cursor-pointer transition-all ${
                    selectedClass === key
                      ? 'bg-emerald-500/15 border-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.2)]'
                      : 'bg-[#1A1E26] border-[#374151] hover:border-[#6B7280]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif italic text-emerald-100 text-sm">{item.name}</span>
                    <span className="text-[10px] text-[#FBBF24] font-mono font-semibold">{item.hp} HP</span>
                  </div>
                  <div className="text-[11px] text-[#9CA3AF] mt-1 line-clamp-2 leading-relaxed">{item.passive}</div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-[#38BDF8] font-mono">
                    <span>RAM: {item.ram}</span>
                    <span>•</span>
                    <span>Armor: +{item.def}</span>
                    <span>•</span>
                    <span>Credits: {item.credits}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Starter Kit */}
          <div>
            <label className="text-[10px] text-[#9CA3AF] uppercase block mb-1 font-semibold tracking-wider">
              Deployment Starter Kit
            </label>
            <select
              value={selectedKit}
              onChange={(e) => setSelectedKit(e.target.value)}
              className="w-full bg-[#080A0F] border border-[#374151] text-[#E5E7EB] p-2.5 rounded-md outline-none focus:border-emerald-500 text-xs"
            >
              <option value="STANDARD">STANDARD — Balanced (2x NanoMed.sys, 1x RAMBoost.exe)</option>
              <option value="HACKER">HACKER — Breach Specialist (2x RAMBoost.exe, 1x AntiVirus.sys)</option>
              <option value="COMBAT">COMBAT — Offensive Assault (1x NeuralMod.bin, 1x NanoMed.sys, 1x EMPGrenade.bin)</option>
              <option value="SCAVENGER">SCAVENGER — Resource Hoarder (2x Decryptor.pkg, 1x NanoMed.sys)</option>
            </select>
          </div>

          {/* Class Preview Summary */}
          <div className="bg-[#1A1E26] border border-[#374151] p-3.5 rounded-md space-y-1.5">
            <div className="text-xs font-serif italic text-[#FBBF24] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 not-italic" />
              <span>{cls.name} Class Analysis</span>
            </div>
            <div className="text-xs text-[#E5E7EB] leading-relaxed">{cls.passive}</div>
            <div className="text-[11px] text-[#9CA3AF] font-mono pt-1">
              Base Profile: {cls.hp} Integrity, {cls.ram} RAM Buffer, +{cls.dmg} Strike DMG, +{cls.def} Sub-dermal Armor.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#11141B] border-t border-[#1F2937] p-4 flex justify-end">
          <button
            onClick={handleLaunch}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold uppercase tracking-wider rounded-md text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(16,185,129,0.3)]"
          >
            <UserCheck className="w-4 h-4" />
            <span>JACK IN & LAUNCH ENGINE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
