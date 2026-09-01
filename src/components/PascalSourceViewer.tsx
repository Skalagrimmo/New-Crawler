import React, { useState } from 'react';
import { X, FileCode, Copy, CheckCircle2, Download, Layers } from 'lucide-react';
import { PASCAL_UNITS, PascalUnitFile } from '../pascal/PascalUnits';
import { touchHaptics } from '../engine/TouchHaptics';

interface PascalSourceViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PascalSourceViewer: React.FC<PascalSourceViewerProps> = ({ isOpen, onClose }) => {
  const [selectedUnit, setSelectedUnit] = useState<PascalUnitFile>(PASCAL_UNITS[0]);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedUnit.code);
    setCopied(true);
    touchHaptics.trigger('light_tap');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([selectedUnit.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedUnit.fileName;
    a.click();
    URL.revokeObjectURL(url);
    touchHaptics.trigger('light_tap');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans">
      <div className="bg-[#0F1219] border border-[#1F2937] rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#11141B] border-b border-[#1F2937] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-100 font-serif italic text-base">
            <FileCode className="w-4 h-4 text-emerald-400 not-italic" />
            <span>Pascal Architecture & Source Units (FreePascal / Castle Engine)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#1A1E26] text-[#9CA3AF] hover:text-[#E5E7EB] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden text-xs text-[#E5E7EB]">
          {/* Unit sidebar */}
          <div className="w-full md:w-64 bg-[#11141B] border-r border-[#1F2937] p-3 space-y-1.5 overflow-y-auto">
            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-2.5 font-semibold flex items-center gap-1.5 px-1">
              <Layers className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Pascal Units ({PASCAL_UNITS.length})</span>
            </div>
            {PASCAL_UNITS.map((unit) => (
              <button
                key={unit.unitName}
                onClick={() => setSelectedUnit(unit)}
                className={`w-full text-left p-2.5 rounded-md border transition-colors ${
                  selectedUnit.unitName === unit.unitName
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
                    : 'bg-[#1A1E26] border-[#374151] hover:border-[#6B7280] text-[#E5E7EB]'
                }`}
              >
                <div className="font-mono text-xs">{unit.fileName}</div>
                <div className="text-[10px] text-[#9CA3AF] truncate mt-0.5">{unit.description}</div>
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col bg-[#080A0F] overflow-hidden">
            <div className="bg-[#11141B] border-b border-[#1F2937] px-4 py-2.5 flex items-center justify-between">
              <div>
                <div className="font-mono font-bold text-[#FBBF24] text-xs">{selectedUnit.fileName}</div>
                <div className="text-[10px] text-[#9CA3AF]">{selectedUnit.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 bg-[#1A1E26] hover:bg-[#252A36] border border-[#374151] text-[#9CA3AF] hover:text-[#E5E7EB] rounded text-xs flex items-center gap-1 transition-colors"
                >
                  {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy Unit'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="px-2.5 py-1 bg-[#1A1E26] hover:bg-[#252A36] border border-[#374151] text-[#9CA3AF] hover:text-[#E5E7EB] rounded text-xs flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download .pas</span>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed text-emerald-200 selection:bg-emerald-500/30">
              <pre className="whitespace-pre-wrap">{selectedUnit.code}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
